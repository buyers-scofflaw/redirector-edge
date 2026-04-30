/**
 * META CAPI DAILY BATCH SENDER
 *
 * Netlify scheduled function that runs once daily at 14:46 UTC.
 * Replaces the legacy `meta-capi-sender` Cloud Run Job.
 *
 * Reads YESTERDAY's settled-revenue rows from v_capi_purchases (a BQ
 * view that joins partner-reported revenue to click_events for FB
 * attribution params + per-click geo). Anti-joins meta_capi_sent_log
 * to skip events that have already been delivered to Meta. Sends a
 * Purchase event per row to the Meta Conversions API. Logs successes
 * to meta_capi_sent_log, failures to meta_capi_error_log, and a
 * per-run summary to meta_capi_run_audit.
 *
 * Relationship to the micro-batch:
 *   - Micro-batch (s1-capi-sender.mts) fires within ~15 min of S1
 *     postback receipt, with estimated revenue per click.
 *   - This daily batch fires the next day, with settled revenue from
 *     the partner reporting feed.
 *   - Meta dedupes on event_id within 48hrs and keeps the FIRST event,
 *     so micro-batch values "win" for overlapping clicks. The daily
 *     batch is the backstop for clicks the micro-batch missed.
 *   - The adjuster (s1-capi-adjuster.mts) handles cases where settled
 *     revenue diverges materially from the micro-batch's estimate.
 *
 * ENV VARS REQUIRED (set in Netlify UI, already configured for s1-capi-sender):
 *   GCP_SERVICE_ACCOUNT_KEY  - Full JSON service account key
 *   META_PIXEL_ID            - Facebook pixel ID
 *   META_ACCESS_TOKEN        - Facebook Conversions API access token
 *
 * Deploy: Place in netlify/functions/s1-capi-daily-batch.mts on redirector-edge.
 */

import type { Config } from "@netlify/functions";

// ── Config ──
const BQ_PROJECT    = "carbon-storm-422904-n0";
const BQ_DATASET    = "my_dataset";
const BQ_VIEW       = "v_capi_purchases";
const SENT_LOG      = "meta_capi_sent_log";
const ERROR_LOG     = "meta_capi_error_log";
const RUN_AUDIT     = "meta_capi_run_audit";
const GRAPH_VERSION = "v19.0";
const BATCH_SIZE    = 1000;
const MAX_ATTEMPTS  = 5;
const DRY_RUN       = false;

// ── JWT / Google Auth helpers (shared pattern with s1-capi-sender.mts) ──

function base64url(input: string | ArrayBuffer): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJwt(
  payload: Record<string, unknown>,
  privateKeyPem: string
): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const segments = [
    base64url(JSON.stringify(header)),
    base64url(JSON.stringify(payload)),
  ];
  const signingInput = segments.join(".");

  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return signingInput + "." + base64url(signature);
}

async function getAccessToken(
  saKey: { client_email: string; private_key: string },
  scopes: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt(
    {
      iss: saKey.client_email,
      scope: scopes,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    saKey.private_key
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// ── Hashing helpers (Meta CAPI field-specific normalization) ──

async function sha256Raw(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Lower(value: string): Promise<string> {
  return sha256Raw(value.trim().toLowerCase());
}

async function hashCity(value: string | null): Promise<string | null> {
  if (!value) return null;
  const norm = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return norm ? sha256Raw(norm) : null;
}

async function hashState(value: string | null): Promise<string | null> {
  if (!value) return null;
  const norm = value.trim().toLowerCase();
  return norm ? sha256Raw(norm) : null;
}

async function hashZip(value: string | null): Promise<string | null> {
  if (!value) return null;
  const digits = value.replace(/\D/g, "").slice(0, 5);
  return digits.length === 5 ? sha256Raw(digits) : null;
}

async function hashCountry(value: string | null): Promise<string | null> {
  if (!value) return null;
  const norm = value.trim().toLowerCase();
  return /^[a-z]{2}$/.test(norm) ? sha256Raw(norm) : null;
}

// ── fbc normalization ──
// If the row has a valid `fb.1.<ms>.<fbclid>` cookie value, use it.
// Otherwise, rebuild from the redirect timestamp (sec→ms) + fbclid.

function normalizeFbc(
  fbcRaw: string | null,
  redirectTsEpoch: number,
  fbclidFromRedirect: string | null
): string {
  if (
    typeof fbcRaw === "string" &&
    /^fb\.1\.\d{10,13}\.[A-Za-z0-9_\-\.]+$/.test(fbcRaw.trim())
  ) {
    return fbcRaw.trim();
  }
  if (fbclidFromRedirect && redirectTsEpoch && redirectTsEpoch > 0) {
    const ms = Math.floor(redirectTsEpoch) * 1000;
    return `fb.1.${ms}.${fbclidFromRedirect}`;
  }
  return "";
}

// ── BigQuery helpers ──

interface PurchaseRow {
  external_id: string;
  event_time_epoch: number;
  redirect_ts_epoch: number;
  value: number;
  currency: string;
  fbc_raw: string | null;
  fbp: string | null;
  fbclid_from_redirect: string | null;
  client_ip_address: string | null;
  client_user_agent: string | null;
  country_code_iso2: string | null;
  geo_city: string | null;
  geo_region: string | null;
  geo_postal_code: string | null;
  event_source_url: string | null;
  event_date_utc: string;       // 'YYYY-MM-DD'
  event_name: string;
}

async function queryYesterdayRows(
  accessToken: string
): Promise<PurchaseRow[]> {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/queries`;

  // Yesterday in UTC. The view itself filters by event_date_utc, and we
  // anti-join sent_log so only undelivered events come back.
  const query = `
    WITH base AS (
      SELECT
        event_name, event_time_epoch, event_id,
        external_id, fbc_raw, fbp, fbclid_from_redirect,
        client_ip_address, client_user_agent,
        country_code_iso2,
        geo_city, geo_region, geo_postal_code,
        event_source_url,
        value, currency, event_date_utc, redirect_ts_epoch
      FROM \`${BQ_PROJECT}.${BQ_DATASET}.${BQ_VIEW}\`
      WHERE event_date_utc = DATE_SUB(CURRENT_DATE('UTC'), INTERVAL 1 DAY)
        AND external_id IS NOT NULL
    ),
    already AS (
      SELECT uid
      FROM \`${BQ_PROJECT}.${BQ_DATASET}.${SENT_LOG}\`
      WHERE event_date_utc = DATE_SUB(CURRENT_DATE('UTC'), INTERVAL 1 DAY)
    )
    SELECT base.*
    FROM base
    LEFT JOIN already a ON a.uid = base.external_id
    WHERE a.uid IS NULL
  `;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      maxResults: 100000,   // daily volume well below this
      timeoutMs: 60000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BigQuery query failed (${res.status}): ${text}`);
  }

  const result = (await res.json()) as {
    rows?: Array<{ f: Array<{ v: string | null }> }>;
    schema: { fields: Array<{ name: string }> };
  };

  if (!result.rows || result.rows.length === 0) return [];

  const fields = result.schema.fields.map((f) => f.name);
  return result.rows.map((row) => {
    const obj: Record<string, string | null> = {};
    row.f.forEach((cell, i) => {
      obj[fields[i]] = cell.v;
    });
    return {
      external_id:          obj.external_id || "",
      event_time_epoch:     parseInt(obj.event_time_epoch || "0", 10),
      redirect_ts_epoch:    parseInt(obj.redirect_ts_epoch || "0", 10),
      value:                parseFloat(obj.value || "0"),
      currency:             obj.currency || "USD",
      fbc_raw:              obj.fbc_raw,
      fbp:                  obj.fbp,
      fbclid_from_redirect: obj.fbclid_from_redirect,
      client_ip_address:    obj.client_ip_address,
      client_user_agent:    obj.client_user_agent,
      country_code_iso2:    obj.country_code_iso2,
      geo_city:             obj.geo_city,
      geo_region:           obj.geo_region,
      geo_postal_code:      obj.geo_postal_code,
      event_source_url:     obj.event_source_url,
      event_date_utc:       obj.event_date_utc || "",
      event_name:           obj.event_name || "Purchase",
    };
  });
}

async function bqInsertAll(
  accessToken: string,
  table: string,
  rows: Array<Record<string, unknown>>
): Promise<void> {
  if (rows.length === 0) return;

  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/datasets/${BQ_DATASET}/tables/${table}/insertAll`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rows: rows.map((r) => ({ json: r })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BQ insert into ${table} failed (${res.status}): ${text}`);
  }

  const result = (await res.json()) as {
    insertErrors?: Array<{ errors: Array<{ message: string }> }>;
  };
  if (result.insertErrors?.length) {
    console.error(`BQ insert errors for ${table}:`, JSON.stringify(result.insertErrors));
  }
}

// ── Meta CAPI ──

interface CapiEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: string;
  user_data: {
    fbc?: string;
    fbp?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    external_id?: string;
    country?: string;
    ct?: string;
    st?: string;
    zp?: string;
  };
  custom_data: {
    value: number;
    currency: string;
  };
}

async function buildEvent(row: PurchaseRow): Promise<CapiEvent> {
  const fbcNorm = normalizeFbc(row.fbc_raw, row.redirect_ts_epoch, row.fbclid_from_redirect);

  const country = await hashCountry(row.country_code_iso2);
  const ct      = await hashCity(row.geo_city);
  const st      = await hashState(row.geo_region);
  const zp      = await hashZip(row.geo_postal_code);

  const ev: CapiEvent = {
    event_name:    row.event_name || "Purchase",
    event_time:    row.event_time_epoch,
    event_id:      row.external_id,
    action_source: "website",
    user_data: {
      external_id: row.external_id,
    },
    custom_data: {
      value:    row.value || 0,
      currency: row.currency || "USD",
    },
  };

  if (fbcNorm)               ev.user_data.fbc = fbcNorm;
  if (row.fbp)               ev.user_data.fbp = row.fbp;
  if (row.client_ip_address) ev.user_data.client_ip_address = row.client_ip_address;
  if (row.client_user_agent) ev.user_data.client_user_agent = row.client_user_agent;
  if (country)               ev.user_data.country = country;
  if (ct)                    ev.user_data.ct = ct;
  if (st)                    ev.user_data.st = st;
  if (zp)                    ev.user_data.zp = zp;
  if (row.event_source_url)  ev.event_source_url = row.event_source_url;

  return ev;
}

async function sendBatch(
  pixelId: string,
  metaToken: string,
  events: CapiEvent[]
): Promise<{ ok: boolean; code: number; text: string; fbtraceId: string }> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`;

  let attempt = 0;
  while (attempt < MAX_ATTEMPTS) {
    attempt += 1;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: events, access_token: metaToken }),
      });
      const text = await resp.text();
      const code = resp.status;

      if (code === 429) {
        const retryAfter = parseInt(resp.headers.get("retry-after") || "15", 10);
        await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
        continue;
      }

      let fbtraceId = "";
      try { fbtraceId = (JSON.parse(text || "{}") || {}).fbtrace_id || ""; } catch {}

      const ok = code >= 200 && code < 300;
      if (ok) return { ok, code, text, fbtraceId };

      // Non-retryable error or final attempt
      if (attempt >= MAX_ATTEMPTS) {
        return { ok: false, code, text, fbtraceId };
      }
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    } catch (e: any) {
      if (attempt >= MAX_ATTEMPTS) {
        return { ok: false, code: -1, text: e?.message || String(e), fbtraceId: "" };
      }
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  return { ok: false, code: -1, text: "exhausted retries", fbtraceId: "" };
}

// ── Main handler ──

export default async (_req: Request) => {
  const startedAt = Date.now();
  console.log("s1-capi-daily-batch: starting daily run");

  const saKeyRaw  = Netlify.env.get("GCP_SERVICE_ACCOUNT_KEY");
  const pixelId   = Netlify.env.get("META_PIXEL_ID");
  const metaToken = Netlify.env.get("META_ACCESS_TOKEN");

  if (!saKeyRaw || !pixelId || !metaToken) {
    console.error("s1-capi-daily-batch: missing env vars", {
      hasGcpKey: !!saKeyRaw,
      hasPixelId: !!pixelId,
      hasMetaToken: !!metaToken,
    });
    return new Response("Missing env vars", { status: 500 });
  }

  try {
    const saKey = JSON.parse(saKeyRaw);
    const bqToken = await getAccessToken(saKey, "https://www.googleapis.com/auth/bigquery");

    // ── 1. Pull yesterday's eligible, unsent rows ──
    const rows = await queryYesterdayRows(bqToken);
    const yday = (() => {
      const d = new Date(Date.now() - 86_400_000);
      return d.toISOString().slice(0, 10);
    })();

    console.log(`s1-capi-daily-batch: ${rows.length} eligible rows for ${yday}`);

    if (rows.length === 0) {
      await bqInsertAll(bqToken, RUN_AUDIT, [{
        event_date_utc:    yday,
        eligible_count:    0,
        sent_count:        0,
        status:            "SKIP_NO_ELIGIBLE",
        sample_fbtrace_id: "",
      }]);
      return new Response("No eligible rows", { status: 200 });
    }

    // ── 2. Defensive in-run dedupe by uid ──
    const seen = new Set<string>();
    const uniq: PurchaseRow[] = [];
    for (const r of rows) {
      if (!r.external_id || seen.has(r.external_id)) continue;
      seen.add(r.external_id);
      uniq.push(r);
    }

    // ── 3. Send in batches to Meta CAPI ──
    let totalSent = 0;
    let runSampleFbtrace = "";

    for (let i = 0; i < uniq.length; i += BATCH_SIZE) {
      const chunk = uniq.slice(i, i + BATCH_SIZE);
      const events = await Promise.all(chunk.map(buildEvent));

      if (DRY_RUN) {
        console.log(`s1-capi-daily-batch: [DRY_RUN] would send ${events.length} events`);
        continue;
      }

      const result = await sendBatch(pixelId, metaToken, events);
      if (!runSampleFbtrace && result.fbtraceId) runSampleFbtrace = result.fbtraceId;

      if (result.ok) {
        totalSent += chunk.length;
        // Log successes to meta_capi_sent_log
        const sentRows = chunk.map((r) => ({
          event_date_utc:     r.event_date_utc,
          uid:                r.external_id,
          event_time_epoch:   r.event_time_epoch,
          value:              r.value,
          currency:           r.currency,
          fbc:                normalizeFbc(r.fbc_raw, r.redirect_ts_epoch, r.fbclid_from_redirect),
          fbp:                r.fbp || "",
          client_ip_address:  r.client_ip_address || "",
          client_user_agent:  r.client_user_agent || "",
          event_source_url:   r.event_source_url || "",
          pixel_id:           pixelId,
          fbtrace_id:         result.fbtraceId,
          batch_size:         chunk.length,
        }));
        await bqInsertAll(bqToken, SENT_LOG, sentRows);
        console.log(
          `s1-capi-daily-batch: batch ${Math.floor(i / BATCH_SIZE) + 1} sent, ` +
          `events=${chunk.length}, fbtrace_id=${result.fbtraceId}`
        );
      } else {
        // Log errors so we can see what failed without re-querying Meta
        const errRows = await Promise.all(chunk.map(async (r) => ({
          event_date_utc:   r.event_date_utc,
          uid:               r.external_id,
          event_time_epoch:  r.event_time_epoch,
          payload:           JSON.stringify(await buildEvent(r)),
          http_code:         result.code,
          error_text:        (result.text || "").slice(0, 1000),
          attempt:           MAX_ATTEMPTS,
        })));
        await bqInsertAll(bqToken, ERROR_LOG, errRows);
        console.error(
          `s1-capi-daily-batch: batch ${Math.floor(i / BATCH_SIZE) + 1} failed, ` +
          `code=${result.code}, error=${result.text.slice(0, 200)}`
        );
      }
    }

    // ── 4. Run audit ──
    await bqInsertAll(bqToken, RUN_AUDIT, [{
      event_date_utc:    yday,
      eligible_count:    rows.length,
      sent_count:        totalSent,
      status:            "OK",
      sample_fbtrace_id: runSampleFbtrace,
    }]);

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      `s1-capi-daily-batch: done. eligible=${rows.length}, sent=${totalSent}, elapsed=${elapsed}s`
    );

    return new Response(
      JSON.stringify({ eligible: rows.length, sent: totalSent, elapsed }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("s1-capi-daily-batch: fatal error:", err?.message || err);
    return new Response(`Error: ${err?.message}`, { status: 500 });
  }
};

// Daily at 14:46 UTC — matches the legacy Cloud Run job's slot.
export const config: Config = {
  schedule: "46 14 * * *",
};
