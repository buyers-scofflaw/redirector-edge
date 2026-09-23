/**
 * S1 UPPER-FUNNEL → META CAPI MICRO-BATCH SENDER
 *
 * Netlify scheduled function, every 5 minutes. Drains
 * s1_capi_upper_funnel_queue (written by s1-impression / s1-search / s1-lead)
 * and fires PageView / Search / Lead events to Meta in bulk.
 *
 * One BigQuery query per sweep: pending queue rows, minus anything already in
 * s1_capi_upper_funnel_log, joined to click_events for match params. This
 * replaces one click_events lookup per event, which billed ~110 MiB each and
 * was ~99% of the project's BigQuery bill at ~$7k/day revenue.
 *
 * Semantics vs. the old instant path:
 *   - event_time = when S1 pinged the receiver (floored at click_time + 1),
 *     so Meta sees the true event time even though delivery is batched.
 *   - Repeat pings with the same event_id (e.g. a page reload re-firing
 *     PageView) are sent once. The old path re-sent them and Meta dropped
 *     the duplicates via event_id dedupe, so what Meta counts is unchanged.
 *   - Clicks are matched in today's + yesterday's click_events partitions
 *     (99.85% of events in Sept 2026). Events with no click after a grace
 *     period are logged skipped_no_click, like before.
 *   - Anything not logged (CAPI or log failure) is retried next sweep for as
 *     long as it stays inside QUEUE_LOOKBACK_HOURS.
 *
 * ENV VARS:
 *   GCP_SERVICE_ACCOUNT_KEY, META_PIXEL_ID, META_ACCESS_TOKEN (existing)
 *   UF_QUEUE_LOOKBACK_HOURS  optional, default 3. Raise temporarily to
 *                            backfill after an outage.
 */

import type { Config } from "@netlify/functions";
import {
  BQ_PROJECT_ID,
  LOG_TABLE,
  QUEUE_TABLE,
  type CapiEvent,
  type ClickMatchRow,
  type UpperFunnelEventInput,
  buildCapiEvent,
  fireCapiEvents,
  getAccessToken,
  insertRows,
  logRow,
  skipReason,
} from "./s1-capi-helpers.mts";

const DS = `${BQ_PROJECT_ID}.my_dataset`;
const CAPI_CHUNK = 500;          // Meta max is 1000 per request
const MAX_ROWS = 5000;           // per sweep; the rest waits for the next one
const NO_CLICK_GRACE_SEC = 600;  // wait this long before giving up on a click
const TIME_BUDGET_MS = 20_000;   // scheduled functions are cut off at 30s

function buildQuery(lookbackHours: number): string {
  return `
    WITH q AS (
      SELECT event_name, uid, event_id, raw_params, received_at
      FROM \`${DS}.${QUEUE_TABLE}\`
      WHERE received_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${lookbackHours} HOUR)
      QUALIFY ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at) = 1
    ),
    done AS (
      SELECT DISTINCT event_id
      FROM \`${DS}.${LOG_TABLE}\`
      WHERE sent_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 DAY)
    ),
    pending AS (
      SELECT q.* FROM q LEFT JOIN done d USING (event_id)
      WHERE d.event_id IS NULL
    ),
    c AS (
      SELECT
        uid, fbc, fbp,
        client_ip AS client_ip_address,
        ua AS client_user_agent,
        event_source_url,
        UNIX_SECONDS(event_time) AS event_time_epoch,
        COALESCE(placement, REGEXP_EXTRACT(dest, r's1pplacement=([^&]+)')) AS placement,
        geo_city, geo_region, geo_postal_code, geo_country
      FROM \`${BQ_PROJECT_ID}.rsoc_clicks.click_events\`
      WHERE event_time >= TIMESTAMP(DATE_SUB(CURRENT_DATE('UTC'), INTERVAL 1 DAY))
        AND uid IN (SELECT uid FROM pending)
      QUALIFY ROW_NUMBER() OVER (PARTITION BY uid ORDER BY event_time DESC) = 1
    )
    SELECT
      p.event_name, p.uid, p.event_id, p.raw_params,
      UNIX_SECONDS(p.received_at) AS received_epoch,
      c.uid IS NOT NULL AS has_click,
      c.fbc, c.fbp, c.client_ip_address, c.client_user_agent, c.event_source_url,
      c.event_time_epoch, c.placement,
      c.geo_city, c.geo_region, c.geo_postal_code, c.geo_country
    FROM pending p
    LEFT JOIN c USING (uid)
    ORDER BY p.received_at
    LIMIT ${MAX_ROWS}
  `;
}

async function runQuery(token: string, query: string): Promise<Record<string, string | null>[]> {
  const res = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT_ID}/queries`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        useLegacySql: false,
        timeoutMs: 15000,
        maxResults: MAX_ROWS,
        labels: { pipeline: "s1-capi-upper-funnel-sender" },
      }),
    }
  );
  if (!res.ok) throw new Error(`BigQuery sweep failed (${res.status}): ${await res.text()}`);

  const result = (await res.json()) as {
    jobComplete?: boolean;
    rows?: Array<{ f: Array<{ v: string | null }> }>;
    schema?: { fields: Array<{ name: string }> };
  };
  if (!result.jobComplete) throw new Error("BigQuery sweep did not finish within 15s");
  if (!result.rows?.length) return [];

  const fields = result.schema!.fields.map((f) => f.name);
  return result.rows.map((r) => {
    const o: Record<string, string | null> = {};
    r.f.forEach((cell, i) => (o[fields[i]] = cell.v));
    return o;
  });
}

function toMatch(r: Record<string, string | null>): ClickMatchRow | null {
  if (r.has_click !== "true") return null;
  return {
    fbc: r.fbc,
    fbp: r.fbp,
    client_ip_address: r.client_ip_address,
    client_user_agent: r.client_user_agent,
    event_source_url: r.event_source_url,
    event_time_epoch: r.event_time_epoch ? parseInt(r.event_time_epoch, 10) : null,
    placement: r.placement || null,
    geo_city: r.geo_city,
    geo_region: r.geo_region,
    geo_postal_code: r.geo_postal_code,
    geo_country: r.geo_country,
  };
}

function parseParams(raw: string | null): Record<string, string> {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default async () => {
  const start = Date.now();
  const saKeyRaw = Netlify.env.get("GCP_SERVICE_ACCOUNT_KEY");
  const pixelId = Netlify.env.get("META_PIXEL_ID");
  const metaToken = Netlify.env.get("META_ACCESS_TOKEN");
  if (!saKeyRaw || !pixelId || !metaToken) {
    console.error("s1-capi-upper-funnel-sender: missing env vars");
    return new Response("missing env", { status: 500 });
  }
  const lookback = Math.max(1, parseInt(Netlify.env.get("UF_QUEUE_LOOKBACK_HOURS") || "3", 10) || 3);

  try {
    const bqToken = await getAccessToken(
      JSON.parse(saKeyRaw),
      "https://www.googleapis.com/auth/bigquery"
    );
    const rows = await runQuery(bqToken, buildQuery(lookback));
    const nowSec = Math.floor(Date.now() / 1000);

    const logRows: Array<{ insertId: string; json: Record<string, unknown> }> = [];
    const toSend: Array<{ ev: UpperFunnelEventInput; match: ClickMatchRow; event: CapiEvent }> = [];
    let waiting = 0;

    for (const r of rows) {
      const ev: UpperFunnelEventInput = {
        eventName: r.event_name!,
        eventId: r.event_id!,
        clickId: r.uid!,
        rawParams: parseParams(r.raw_params),
        receivedEpoch: parseInt(r.received_epoch!, 10),
      };
      const match = toMatch(r);
      const skip = skipReason(match);
      if (skip === "skipped_no_click" && nowSec - ev.receivedEpoch < NO_CLICK_GRACE_SEC) {
        waiting++; // click row may not have landed yet; retry next sweep
        continue;
      }
      if (skip) {
        logRows.push({ insertId: `${ev.eventId}:${skip}`, json: logRow(ev, skip) });
        continue;
      }
      toSend.push({ ev, match: match!, event: await buildCapiEvent(ev, match!) });
    }

    // Fire in chunks. If Meta rejects a whole chunk, retry its events one by
    // one so a single bad event can't block the rest.
    let sent = 0;
    let failed = 0;
    let deferred = 0;
    for (let i = 0; i < toSend.length; i += CAPI_CHUNK) {
      if (Date.now() - start > TIME_BUDGET_MS) {
        deferred = toSend.length - i; // picked up next sweep
        break;
      }
      const chunk = toSend.slice(i, i + CAPI_CHUNK);
      const record = (items: typeof chunk, fbtraceId: string) => {
        for (const s of items) {
          logRows.push({
            insertId: `${s.ev.eventId}:sent`,
            json: logRow(s.ev, "sent", { event: s.event, match: s.match, pixelId, fbtraceId }),
          });
        }
        sent += items.length;
      };
      try {
        const res = await fireCapiEvents(pixelId, metaToken, chunk.map((s) => s.event));
        record(chunk, res.fbtrace_id);
      } catch (err: any) {
        console.error(`s1-capi-upper-funnel-sender: chunk rejected, retrying singly:`, err?.message);
        for (const s of chunk) {
          try {
            const res = await fireCapiEvents(pixelId, metaToken, [s.event]);
            record([s], res.fbtrace_id);
          } catch (e: any) {
            failed++; // not logged, so it is retried next sweep
            console.error(`s1-capi-upper-funnel-sender: ${s.ev.eventId} failed:`, e?.message);
          }
        }
      }
    }

    await insertRows(bqToken, LOG_TABLE, logRows);

    const summary = {
      pending: rows.length,
      sent,
      skipped: logRows.length - sent,
      waiting_for_click: waiting,
      failed,
      deferred,
      elapsed_s: ((Date.now() - start) / 1000).toFixed(1),
    };
    console.log("s1-capi-upper-funnel-sender:", JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("s1-capi-upper-funnel-sender: fatal:", err?.message || err);
    return new Response(`Error: ${err?.message}`, { status: 500 });
  }
};

export const config: Config = {
  schedule: "*/5 * * * *",
};
