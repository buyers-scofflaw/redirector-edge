/**
 * S1 CAPI REVENUE ADJUSTMENT SENDER
 *
 * Netlify scheduled function that runs once daily at 15:00 UTC
 * (after the daily batch completes at ~14:46 UTC).
 *
 * Compares settled revenue (S1 partner report, v_ad_widget_daily_all)
 * against the SUM of everything the micro-batch sent for the click
 * (s1_capi_sent_log holds one row per postback since 2026-09).
 * For clicks where the settled value exceeds that sum by ADJ_THRESHOLD or more,
 * sends an adjustment Purchase event to Meta CAPI with:
 *   - event_id = uid + "_adj"  (avoids dedup with the original event)
 *   - value = settled - estimated  (the delta only)
 *
 * This ensures Meta receives the full revenue picture for value-based
 * optimization, at the cost of slight conversion count inflation
 * on the adjusted events (~25% of total events).
 *
 * ENV VARS REQUIRED (same as s1-capi-sender):
 *   GCP_SERVICE_ACCOUNT_KEY  - Full JSON service account key
 *   META_PIXEL_ID            - Facebook pixel ID
 *   META_ACCESS_TOKEN        - Facebook Conversions API access token
 *
 * Deploy: Place in netlify/functions/s1-capi-adjuster.mts on redirector-edge
 */

import type { Config } from "@netlify/functions";

// ── Config ──
const BQ_PROJECT = "carbon-storm-422904-n0";
const BQ_DATASET = "my_dataset";
const GRAPH_VERSION = "v19.0";
const ADJ_THRESHOLD = 0.10; // 10% threshold

// ── JWT / Google Auth helpers (shared with s1-capi-sender.mts) ──

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

interface AdjRow {
  uid: string;
  micro_value: number;
  daily_value: number;
  adj_value: number;
  event_date_utc: string;
  fbc: string | null;
  fbp: string | null;
  client_ip_address: string | null;
  client_user_agent: string | null;
  event_source_url: string | null;
  event_time_epoch: number;
}

async function queryBigQuery(
  accessToken: string,
  query: string
): Promise<AdjRow[]> {
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
      maxResults: 20000,
      timeoutMs: 30000,
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
      uid: obj.uid as string,
      micro_value: parseFloat(obj.micro_value as string),
      daily_value: parseFloat(obj.daily_value as string),
      adj_value: parseFloat(obj.adj_value as string),
      event_date_utc: obj.event_date_utc as string,
      fbc: obj.fbc as string | null,
      fbp: obj.fbp as string | null,
      client_ip_address: obj.client_ip_address as string | null,
      client_user_agent: obj.client_user_agent as string | null,
      event_source_url: obj.event_source_url as string | null,
      event_time_epoch: parseInt(obj.event_time_epoch as string, 10),
    };
  });
}

async function insertAdjLog(
  accessToken: string,
  rows: Array<Record<string, unknown>>
): Promise<void> {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/datasets/${BQ_DATASET}/tables/s1_capi_adj_log/insertAll`;

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
    throw new Error(`BigQuery adj_log insert failed (${res.status}): ${text}`);
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
  console.log("s1-capi-adjuster: starting daily adjustment run");

  // ── Load env vars ──
  const saKeyRaw = Netlify.env.get("GCP_SERVICE_ACCOUNT_KEY");
  const pixelId = Netlify.env.get("META_PIXEL_ID");
  const metaToken = Netlify.env.get("META_ACCESS_TOKEN");

  if (!saKeyRaw || !pixelId || !metaToken) {
    console.error("s1-capi-adjuster: missing env vars", {
      hasGcpKey: !!saKeyRaw,
      hasPixelId: !!pixelId,
      hasMetaToken: !!metaToken,
    });
    return new Response("Missing env vars", { status: 500 });
  }

  try {
    const saKey = JSON.parse(saKeyRaw);

    const bqToken = await getAccessToken(
      saKey,
      "https://www.googleapis.com/auth/bigquery"
    );

    // ── 1. Clicks where settled revenue exceeds what was sent by ADJ_THRESHOLD+ ──
    // settled: yesterday's partner-reported revenue per click (uid = ad_id).
    //   Read from the report directly; meta_capi_sent_log now only holds the
    //   daily batch's backstop sends, not every settled click.
    // micro:   everything the micro-batch sent per click (one row per
    //   postback, deduped by event_id; legacy rows have event_id NULL and
    //   are one per click). Match params are identical across a click's rows.
    // Postbacks that arrive after this runs are rare (8 of 54,514 in
    //   Sept 5-15, $7.68) and would be sent on top of the adjustment.
    const query = `
      WITH settled AS (
        -- Last 3 settled days (not just yesterday) so a missed or failed run
        -- is caught by the next ones; s1_capi_adj_log prevents a second
        -- adjustment. Summed per click across dates, so a session whose
        -- revenue is reported on two dates is compared in full.
        SELECT
          CAST(ad_id AS STRING)                          AS uid,
          MAX(data_date)                                 AS event_date_utc,
          SUM(SAFE_CAST(partner_net_revenue AS FLOAT64)) AS daily_value
        FROM \`${BQ_PROJECT}.${BQ_DATASET}.v_ad_widget_daily_all\`
        WHERE data_date BETWEEN DATE_SUB(CURRENT_DATE('UTC'), INTERVAL 3 DAY)
                            AND DATE_SUB(CURRENT_DATE('UTC'), INTERVAL 1 DAY)
        GROUP BY 1
      ),
      micro AS (
        SELECT
          uid,
          SUM(value)                  AS micro_value,
          ANY_VALUE(fbc)              AS fbc,
          ANY_VALUE(fbp)              AS fbp,
          ANY_VALUE(client_ip_address) AS client_ip_address,
          ANY_VALUE(client_user_agent) AS client_user_agent,
          ANY_VALUE(event_source_url) AS event_source_url,
          MIN(event_time_epoch)       AS event_time_epoch
        FROM (
          SELECT *
          FROM \`${BQ_PROJECT}.${BQ_DATASET}.s1_capi_sent_log\`
          WHERE sent_at >= TIMESTAMP(DATE_SUB(CURRENT_DATE('UTC'), INTERVAL 10 DAY))
          QUALIFY ROW_NUMBER() OVER (PARTITION BY COALESCE(event_id, uid) ORDER BY sent_at) = 1
        )
        GROUP BY uid
      )
      SELECT
        d.uid,
        m.micro_value,
        d.daily_value,
        ROUND(d.daily_value - m.micro_value, 2)     AS adj_value,
        CAST(d.event_date_utc AS STRING)            AS event_date_utc,
        m.fbc,
        m.fbp,
        m.client_ip_address,
        m.client_user_agent,
        m.event_source_url,
        m.event_time_epoch
      FROM settled d
      INNER JOIN micro m ON d.uid = m.uid
      LEFT JOIN \`${BQ_PROJECT}.${BQ_DATASET}.s1_capi_adj_log\` a
        ON d.uid = a.uid
      WHERE d.daily_value > m.micro_value
        AND (d.daily_value - m.micro_value) / d.daily_value >= ${ADJ_THRESHOLD}
        AND a.uid IS NULL
        -- Meta rejects the whole batch if any event is >7 days old.
        AND m.event_time_epoch >= UNIX_SECONDS(TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 DAY))
    `;

    const rows = await queryBigQuery(bqToken, query);
    console.log(`s1-capi-adjuster: found ${rows.length} events needing adjustment`);

    if (rows.length === 0) {
      console.log("s1-capi-adjuster: nothing to adjust, done");
      return new Response("No adjustments needed", { status: 200 });
    }

    // ── 2. Build CAPI adjustment events ──
    const capiEvents: CapiEvent[] = [];
    const validRows: AdjRow[] = [];

    for (const row of rows) {
      if (!row.fbc && !row.fbp) {
        console.warn(`s1-capi-adjuster: skipping ${row.uid} — no fbc/fbp`);
        continue;
      }

      const adjEventId = row.uid + "_adj";
      const hashedExternalId = await sha256(row.uid);

      const event: CapiEvent = {
        event_name: "Purchase",
        event_time: row.event_time_epoch,
        event_id: adjEventId,
        event_source_url: row.event_source_url || "https://search.etoptip.com/",
        action_source: "website",
        user_data: {
          ...(row.fbc && { fbc: row.fbc }),
          ...(row.fbp && { fbp: row.fbp }),
          ...(row.client_ip_address && { client_ip_address: row.client_ip_address }),
          ...(row.client_user_agent && { client_user_agent: row.client_user_agent }),
          external_id: hashedExternalId,
        },
        custom_data: {
          value: row.adj_value,
          currency: "USD",
        },
      };

      capiEvents.push(event);
      validRows.push(row);
    }

    if (capiEvents.length === 0) {
      console.log("s1-capi-adjuster: no valid adjustment events, done");
      return new Response("No valid adjustments", { status: 200 });
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
        `s1-capi-adjuster: sent batch ${Math.floor(i / batchSize) + 1}, ` +
        `events_received=${result.events_received}, fbtrace_id=${result.fbtrace_id}`
      );
    }

    // ── 4. Log to s1_capi_adj_log ──
    const nowEpoch = Date.now() / 1000;
    const adjLogRows = validRows.map((row) => ({
      sent_at: nowEpoch,
      event_date_utc: row.event_date_utc,
      uid: row.uid,
      event_id: row.uid + "_adj",
      event_time_epoch: row.event_time_epoch,
      micro_value: row.micro_value,
      daily_value: row.daily_value,
      adj_value: row.adj_value,
      currency: "USD",
      fbc: row.fbc || "",
      fbp: row.fbp || "",
      client_ip_address: row.client_ip_address || "",
      client_user_agent: row.client_user_agent || "",
      event_source_url: row.event_source_url || "",
      pixel_id: pixelId,
      fbtrace_id: lastFbtraceId,
      batch_size: capiEvents.length,
    }));

    await insertAdjLog(bqToken, adjLogRows);
    console.log(`s1-capi-adjuster: logged ${adjLogRows.length} rows to s1_capi_adj_log`);

    const totalAdjRevenue = validRows.reduce((sum, r) => sum + r.adj_value, 0).toFixed(2);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `s1-capi-adjuster: done. adjusted=${totalSent}, adj_revenue=$${totalAdjRevenue}, elapsed=${elapsed}s`
    );

    return new Response(
      JSON.stringify({
        adjusted: totalSent,
        adj_revenue: totalAdjRevenue,
        logged: adjLogRows.length,
        elapsed,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("s1-capi-adjuster: fatal error:", err?.message || err);
    return new Response(`Error: ${err?.message}`, { status: 500 });
  }
};

export const config: Config = {
  schedule: "0 15 * * *",
};
