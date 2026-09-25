/**
 * DURABLE BIGQUERY WRITES FOR THE S1 RECEIVERS
 *
 * Shared by s1-postback.mts (revenue postbacks), s1-capi-helpers.mts
 * (PageView/Search/Lead queue) and s1-bq-pending-replay.mts.
 * Lives in _shared/ so Netlify bundles it into callers instead of deploying
 * it as a function.
 *
 * 1. Token reuse. One Google access token per warm instance per scope,
 *    reused until 5 min before expiry (tokens last 60 min). Concurrent
 *    requests share one in-flight fetch. Before this, every ping signed a JWT
 *    and called oauth2.googleapis.com.
 * 2. Retries. Token fetch and insertAll retry on network errors, timeouts,
 *    429 and 5xx with short jittered backoff; a 401/403 drops the cached
 *    token and refetches once. Everything stops at a 6 s deadline so a
 *    Netlify function never runs long.
 * 3. Pending store. Rows that still fail are written to the Netlify Blobs
 *    store "bq-pending" (key "<dataset>.<table>/<ms>-<insertId>").
 *    s1-bq-pending-replay.mts retries them every 10 min with a fresh token
 *    and the same insertId. Revenue postbacks go further: they are written
 *    to the pending store BEFORE the receiver answers S1 (write-ahead) and
 *    deleted once BigQuery accepts them, so a crash mid-insert loses nothing.
 */

import { getStore } from "@netlify/blobs";

export const BQ_PROJECT = "carbon-storm-422904-n0";
export const PENDING_STORE = "bq-pending";
export const SCOPE_BQ = "https://www.googleapis.com/auth/bigquery";
export const SCOPE_BQ_INSERT = "https://www.googleapis.com/auth/bigquery.insertdata";

const DEADLINE_MS = 6000;           // total budget for one durable insert
const TOKEN_TIMEOUT_MS = 3000;
const INSERT_TIMEOUT_MS = 4000;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const BACKOFF_MS = [200, 800];      // before attempt 2 and 3

export interface SaKey { client_email: string; private_key: string }
export interface BqRow { insertId?: string; json: Record<string, unknown> }
export interface PendingEntry {
  dataset: string;
  table: string;
  rows: BqRow[];
  first_failed_at: string;
  attempts: number;
  last_error: string;
  source: string;
}

class HttpError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
/** insertAll accepted the request but rejected rows (schema etc.). Retrying won't help. */
class RowError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms: number) => ms + Math.floor(Math.random() * ms * 0.5);
const retryable = (e: unknown) =>
  !(e instanceof HttpError) || e.status === 429 || e.status >= 500;

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ── JWT signing (key import cached per instance) ──

let keyCache: { pem: string; key: CryptoKey } | null = null;

function base64url(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importKey(pem: string): Promise<CryptoKey> {
  if (keyCache?.pem === pem) return keyCache.key;
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(body), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  keyCache = { pem, key };
  return key;
}

async function signJwt(sa: SaKey, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const input =
    base64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    base64url(JSON.stringify({
      iss: sa.client_email, scope, aud: "https://oauth2.googleapis.com/token",
      iat: now, exp: now + 3600,
    }));
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", await importKey(sa.private_key), new TextEncoder().encode(input)
  );
  return input + "." + base64url(sig);
}

// ── Access token: cached, de-duplicated, retried ──

const tokenCache = new Map<string, { token: string; expMs: number }>();
const inflight = new Map<string, Promise<string>>();

async function fetchToken(sa: SaKey, scope: string, deadline: number): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      if (Date.now() + BACKOFF_MS[attempt - 1] > deadline) break;
      await sleep(jitter(BACKOFF_MS[attempt - 1]));
    }
    try {
      const res = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${await signJwt(sa, scope)}`,
      }, Math.min(TOKEN_TIMEOUT_MS, Math.max(500, deadline - Date.now())));
      if (!res.ok) throw new HttpError(`token ${res.status}: ${(await res.text()).slice(0, 200)}`, res.status);
      const data = (await res.json()) as { access_token: string; expires_in?: number };
      tokenCache.set(sa.client_email + "|" + scope, {
        token: data.access_token,
        expMs: Date.now() + (data.expires_in ?? 3600) * 1000,
      });
      return data.access_token;
    } catch (e) {
      lastErr = e;
      if (!retryable(e)) break;   // e.g. 400 invalid_grant: bad key, don't hammer
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function getAccessToken(sa: SaKey, scope: string, deadline = Date.now() + DEADLINE_MS): Promise<string> {
  const k = sa.client_email + "|" + scope;
  const cached = tokenCache.get(k);
  if (cached && cached.expMs - Date.now() > TOKEN_REFRESH_MARGIN_MS) return cached.token;
  let p = inflight.get(k);
  if (!p) {
    p = fetchToken(sa, scope, deadline).finally(() => inflight.delete(k));
    inflight.set(k, p);
  }
  return p;
}

function dropToken(sa: SaKey, scope: string) {
  tokenCache.delete(sa.client_email + "|" + scope);
}

export function parseSaKey(raw: string | undefined): SaKey {
  if (!raw) throw new Error("GCP_SERVICE_ACCOUNT_KEY not set");
  return JSON.parse(raw) as SaKey;
}

// ── insertAll with retries ──

async function insertAllOnce(token: string, dataset: string, table: string, rows: BqRow[], timeoutMs: number) {
  const res = await fetchWithTimeout(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/datasets/${dataset}/tables/${table}/insertAll`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    },
    timeoutMs
  );
  if (!res.ok) throw new HttpError(`insertAll ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status);
  const body = (await res.json()) as { insertErrors?: unknown[] };
  if (body.insertErrors?.length) throw new RowError(`insertErrors: ${JSON.stringify(body.insertErrors).slice(0, 300)}`);
}

/** Try to insert with retries. Throws the last error if all attempts fail. */
export async function insertWithRetry(
  sa: SaKey, scope: string, dataset: string, table: string, rows: BqRow[],
  deadline = Date.now() + DEADLINE_MS
): Promise<void> {
  let lastErr: unknown;
  let refreshed = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      if (Date.now() + BACKOFF_MS[attempt - 1] > deadline) break;
      await sleep(jitter(BACKOFF_MS[attempt - 1]));
    }
    try {
      const token = await getAccessToken(sa, scope, deadline);
      await insertAllOnce(token, dataset, table, rows,
        Math.min(INSERT_TIMEOUT_MS, Math.max(500, deadline - Date.now())));
      return;
    } catch (e) {
      lastErr = e;
      if (e instanceof RowError) break;
      if (e instanceof HttpError && (e.status === 401 || e.status === 403) && !refreshed) {
        dropToken(sa, scope);       // stale or revoked token: refetch once
        refreshed = true;
        continue;
      }
      if (!retryable(e)) break;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// ── Pending store (Netlify Blobs) ──

function pendingStore() {
  return getStore({ name: PENDING_STORE, consistency: "strong" });
}

export function pendingKey(dataset: string, table: string, id: string, atMs = Date.now()): string {
  return `${dataset}.${table}/${atMs}-${id}`;
}

export async function putPending(key: string, entry: PendingEntry): Promise<void> {
  await pendingStore().setJSON(key, entry);
}

export async function deletePending(key: string): Promise<void> {
  await pendingStore().delete(key);
}

/**
 * Insert with retries; if that still fails, park the rows in the pending
 * store for the replay job. Never throws. Used in context.waitUntil, after
 * the receiver has answered, so none of this adds latency for the caller.
 */
export async function insertOrPark(opts: {
  saKeyRaw: string | undefined;
  scope: string;
  dataset: string;
  table: string;
  rows: BqRow[];
  source: string;
}): Promise<"inserted" | "parked" | "lost"> {
  const id = opts.rows[0]?.insertId ?? crypto.randomUUID();
  try {
    await insertWithRetry(parseSaKey(opts.saKeyRaw), opts.scope, opts.dataset, opts.table, opts.rows);
    return "inserted";
  } catch (e: any) {
    const entry: PendingEntry = {
      dataset: opts.dataset, table: opts.table, rows: opts.rows,
      first_failed_at: new Date().toISOString(), attempts: 1,
      last_error: String(e?.message ?? e).slice(0, 500), source: opts.source,
    };
    try {
      await putPending(pendingKey(opts.dataset, opts.table, id), entry);
      console.warn(`${opts.source}: insert failed, parked for replay: ${entry.last_error}`);
      return "parked";
    } catch (e2: any) {
      // Last resort: the full row is in the function log for manual recovery.
      console.error(`${opts.source}: insert AND park failed (${e2?.message}); LOST ROW:`, JSON.stringify(entry));
      return "lost";
    }
  }
}
