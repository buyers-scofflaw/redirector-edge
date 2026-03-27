/**
 * S1 POSTBACK → META CAPI MICRO-BATCH SENDER
 *
 * Netlify scheduled function that runs every 15 minutes.
 * Queries s1_postbacks for unsent revenue events, joins with click_events
 * for FB attribution params, and sends to Meta Conversions API.
 *
 * Writes to s1_capi_sent_log (separate from the daily batch's
 * meta_capi_sent_log) so the daily batch is unaffected and can still
 * send final settled revenue for any events this pipeline missed.
 * Meta deduplicates on event_id within 48hrs for overlapping events.
 *
 * Events with $0 or null revenue are skipped — they'll be picked up
 * by the daily batch once the final revenue settles.
 *
 * ENV VARS REQUIRED (set in Netlify UI):
 *   GCP_SERVICE_ACCOUNT_KEY  - Full JSON service account key
 *   META_PIXEL_ID            - Facebook pixel ID
 *   META_ACCESS_TOKEN        - Facebook Conversions API access token
 *
 * Deploy: Place in netlify/functions/s1-capi-sender.mts on redirector-edge
 */

import type { Config } from "@netlify/functions";

// ── Config ──
const BQ_PROJECT = "carbon-storm-422904-n0";
const BQ_DATASET = "my_dataset";
const GRAPH_VERSION = "v19.0";

// ── JWT / Google Auth helpers (shared with s1-postback.mts) ──

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

// ── BigQuery helpers ──

interface PostbackRow {
  click_id: string;
  revenue: number;
  received_at: number;
  fbc_raw: string | null;
  fbp: string | null;
  client_ip_address: string | null;
  client_user_agent: string | null;
  event_source_url: string | null;
  event_time_epoch: number;
}

async function queryBigQuery(
  accessToken: string,
  query: string
): Promise<PostbackRow[]> {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/queries`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      maxResults: 500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BigQuery query failed (${res.status}): ${text}`);
  }

  const result = (await res.json()) as {
    rows?: Array<{ f: Array<{ v: string | null }> }>;
    schema: { fields: Array<{ name: string }> };
    totalRows: string;
  };

  if (!result.rows || result.rows.length === 0) return [];

  const fields = result.schema.fields.map((f) => f.name);
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    row.f.forEach((cell, i) => {
      obj[fields[i]] = cell.v;
    });
    return {
      click_id: obj.click_id as string,
      revenue: parseFloat(obj.revenue as string),
      received_at: parseInt(obj.received_at as string, 10),
      fbc_raw: obj.fbc_raw as string | null,
      fbp: obj.fbp as string | null,
      client_ip_address: obj.client_ip_address as string | null,
      client_user_agent: obj.client_user_agent as string | null,
      event_source_url: obj.event_source_url as string | null,
      event_time_epoch: parseInt(obj.event_time_epoch as string, 10),
    };
  });
}

async function insertSentLog(
  accessToken: string,
  rows: Array<Record<string, unknown>>
): Promise<void> {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/datasets/${BQ_DATASET}/tables/s1_capi_sent_log/insertAll`;

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
    throw new Error(`BigQuery sent_log insert failed (${res.status}): ${text}`);
  }
}

// ── Meta CAPI helpers ──

interface CapiEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: string;
  user_data: {
    fbc?: string;
    fbp?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    external_id?: string;
  };
  custom_data: {
    value: number;
    currency: string;
  };
}

async function sendToMetaCapi(
  pixelId: string,
  accessToken: string,
  events: CapiEvent[]
): Promise<{ fbtrace_id: string; events_received: number }> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: events,
      access_token: accessToken,
    }),
  });

  const body = (await res.json()) as {
    fbtrace_id?: string;
    events_received?: number;
    error?: { message: string; code: number };
  };

  if (!res.ok || body.error) {
    throw new Error(
      `Meta CAPI error (${res.status}): ${body.error?.message || JSON.stringify(body)}`
    );
  }

  return {
    fbtrace_id: body.fbtrace_id || "",
    events_received: body.events_received || 0,
  };
}

// ── SHA-256 hash helper for external_id ──

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Main handler ──

export default async (req: Request) => {
  const startTime = Date.now();
  console.log("s1-capi-sender: starting micro-batch run");

  // ── Load env vars ──
  const saKeyRaw = Netlify.env.get("GCP_SERVICE_ACCOUNT_KEY");
  const pixelId = Netlify.env.get("META_PIXEL_ID");
  const metaToken = Netlify.env.get("META_ACCESS_TOKEN");

  if (!saKeyRaw || !pixelId || !metaToken) {
    console.error("s1-capi-sender: missing env vars", {
      hasGcpKey: !!saKeyRaw,
      hasPixelId: !!pixelId,
      hasMetaToken: !!metaToken,
    });
    return new Response("Missing env vars", { status: 500 });
  }

  try {
    const saKey = JSON.parse(saKeyRaw);

    // Need both bigquery.insertdata AND bigquery.jobs for queries
    const bqToken = await getAccessToken(
      saKey,
      "https://www.googleapis.com/auth/bigquery"
    );

    // ── 1. Query for unsent revenue postbacks with FB params ──
    // Dedup: S1 occasionally double-fires rev_click_track_url,
    // so we take only the latest postback per click_id.
    const query = `
      WITH deduped_postbacks AS (
        SELECT click_id, revenue, received_at
        FROM \`${BQ_PROJECT}.${BQ_DATASET}.s1_postbacks\`
        WHERE type = 'revenue'
          AND revenue IS NOT NULL
          AND revenue > 0
          AND inserted_at >= TIMESTAMP(DATE_SUB(CURRENT_DATE('UTC'), INTERVAL 2 DAY))
        QUALIFY ROW_NUMBER() OVER (PARTITION BY click_id ORDER BY inserted_at DESC) = 1
      )
      SELECT
        p.click_id,
        p.revenue,
        p.received_at,
        c.fbc       AS fbc_raw,
        c.fbp,
        c.client_ip AS client_ip_address,
        c.ua        AS client_user_agent,
        c.event_source_url,
        UNIX_SECONDS(
          CASE
            WHEN TIMESTAMP_ADD(c.event_time, INTERVAL 5 MINUTE)
                 >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 SECOND)
            THEN TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 SECOND)
            ELSE TIMESTAMP_ADD(c.event_time, INTERVAL 5 MINUTE)
          END
        ) AS event_time_epoch
      FROM deduped_postbacks p
      JOIN \`${BQ_PROJECT}.rsoc_clicks.click_events\` c
        ON p.click_id = c.uid
        AND c.event_time >= TIMESTAMP(DATE_SUB(CURRENT_DATE('UTC'), INTERVAL 7 DAY))
      LEFT JOIN \`${BQ_PROJECT}.${BQ_DATASET}.s1_capi_sent_log\` s
        ON p.click_id = s.uid
      WHERE s.uid IS NULL
    `;

    const rows = await queryBigQuery(bqToken, query);
    console.log(`s1-capi-sender: found ${rows.length} unsent revenue events`);

    if (rows.length === 0) {
      console.log("s1-capi-sender: nothing to send, done");
      return new Response("No events to send", { status: 200 });
    }

    // ── 2. Build CAPI events ──
    const capiEvents: CapiEvent[] = [];
    const validRows: PostbackRow[] = [];

    for (const row of rows) {
      // Skip rows missing FB attribution (can't match to a user)
      if (!row.fbc_raw && !row.fbp) {
        console.warn(`s1-capi-sender: skipping ${row.click_id} — no fbc/fbp`);
        continue;
      }

      const hashedExternalId = await sha256(row.click_id);

      const event: CapiEvent = {
        event_name: "Purchase",
        event_time: row.event_time_epoch,
        event_id: row.click_id,
        event_source_url: row.event_source_url || "https://search.etoptip.com/",
        action_source: "website",
        user_data: {
          ...(row.fbc_raw && { fbc: row.fbc_raw }),
          ...(row.fbp && { fbp: row.fbp }),
          ...(row.client_ip_address && { client_ip_address: row.client_ip_address }),
          ...(row.client_user_agent && { client_user_agent: row.client_user_agent }),
          external_id: hashedExternalId,
        },
        custom_data: {
          value: row.revenue,
          currency: "USD",
        },
      };

      capiEvents.push(event);
      validRows.push(row);
    }

    if (capiEvents.length === 0) {
      console.log("s1-capi-sender: no valid events with FB params, done");
      return new Response("No valid events", { status: 200 });
    }

    // ── 3. Send to Meta CAPI (batch up to 1000 per request) ──
    const batchSize = 1000;
    let totalSent = 0;
    let lastFbtraceId = "";

    for (let i = 0; i < capiEvents.length; i += batchSize) {
      const batch = capiEvents.slice(i, i + batchSize);
      const result = await sendToMetaCapi(pixelId, metaToken, batch);
      totalSent += result.events_received;
      lastFbtraceId = result.fbtrace_id;
      console.log(
        `s1-capi-sender: sent batch ${Math.floor(i / batchSize) + 1}, ` +
        `events_received=${result.events_received}, fbtrace_id=${result.fbtrace_id}`
      );
    }

    // ── 4. Log to meta_capi_sent_log ──
    const nowEpoch = Date.now() / 1000;
    const sentLogRows = validRows.map((row) => ({
      sent_at: nowEpoch,
      event_date_utc: new Date(row.received_at * 1000).toISOString().slice(0, 10),
      uid: row.click_id,
      event_time_epoch: row.event_time_epoch,
      value: row.revenue,
      currency: "USD",
      fbc: row.fbc_raw || "",
      fbp: row.fbp || "",
      client_ip_address: row.client_ip_address || "",
      client_user_agent: row.client_user_agent || "",
      event_source_url: row.event_source_url || "",
      pixel_id: pixelId,
      fbtrace_id: lastFbtraceId,
      batch_size: capiEvents.length,
    }));

    await insertSentLog(bqToken, sentLogRows);
    console.log(`s1-capi-sender: logged ${sentLogRows.length} rows to meta_capi_sent_log`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `s1-capi-sender: done. sent=${totalSent}, logged=${sentLogRows.length}, elapsed=${elapsed}s`
    );

    return new Response(
      JSON.stringify({ sent: totalSent, logged: sentLogRows.length, elapsed }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("s1-capi-sender: fatal error:", err?.message || err);
    return new Response(`Error: ${err?.message}`, { status: 500 });
  }
};

export const config: Config = {
  schedule: "*/15 * * * *",
};
