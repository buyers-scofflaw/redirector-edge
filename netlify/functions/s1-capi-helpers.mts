/**
 * SHARED CAPI HELPERS
 *
 * Used by the three instant-fire upper-funnel receivers:
 *   - s1-lead.mts         (Meta "Lead" event on click_track_url)
 *   - s1-impression.mts   (Meta "PageView" event on impression_track_url)
 *   - s1-search.mts       (Meta "Search" event on search_track_url)
 *
 * Architecture: S1 pings a receiver URL on each funnel event. The receiver
 * responds 200 immediately and, by default (UPPER_FUNNEL_MODE=queue), appends
 * the event to s1_capi_upper_funnel_queue. The s1-capi-upper-funnel-sender
 * scheduled function drains the queue every 5 minutes: one BigQuery join
 * for all pending events, then CAPI in bulk. Events reach Meta 0-5 min after
 * S1's ping, with event_time set to when the ping arrived.
 *
 * Why: the previous design ran one click_events lookup per event. Each
 * lookup was billed the full 7-day window (~110 MiB), so cost grew with
 * volume squared and was ~99% of the project's BigQuery bill in Sept 2026.
 *
 * UPPER_FUNNEL_MODE=instant restores the per-event lookup + immediate fire.
 * All fires (both modes) are logged to s1_capi_upper_funnel_log.
 *
 * Purchase events still flow through s1-postback.mts + s1-capi-sender.mts
 * on the existing 15-minute cron.
 *
 * ENV VARS REQUIRED:
 *   GCP_SERVICE_ACCOUNT_KEY - Full JSON service account key
 *   META_PIXEL_ID           - Facebook pixel ID
 *   META_ACCESS_TOKEN       - Facebook Conversions API access token
 */

import type { Context } from "@netlify/functions";
import { SCOPE_BQ, getAccessToken, insertOrPark } from "./_shared/durable-bq.mts";

// ── Config ──
const BQ_PROJECT = "carbon-storm-422904-n0";
const BQ_DATASET = "my_dataset";
export const BQ_PROJECT_ID = BQ_PROJECT;
export const LOG_TABLE = "s1_capi_upper_funnel_log";
// Receivers append here in queue mode; s1-capi-upper-funnel-sender drains it.
export const QUEUE_TABLE = "s1_capi_upper_funnel_queue";
const GRAPH_VERSION = "v19.0";

// ── Google auth: cached token + retries (shared with s1-postback) ──
// Re-exported so existing callers keep using getAccessToken(saKey, scope).
export { getAccessToken } from "./_shared/durable-bq.mts";

// ── SHA-256 helpers ──
// Meta CAPI requires field-specific normalization before hashing.
// Spec: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters

async function sha256Raw(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// external_id: trim + lowercase (matches existing behavior).
async function sha256(value: string): Promise<string> {
  return sha256Raw(value.trim().toLowerCase());
}

// City: lowercase, strip non-alphanumeric. "New York" -> "newyork".
async function hashCity(value: string | null): Promise<string | null> {
  if (!value) return null;
  const norm = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return norm ? sha256Raw(norm) : null;
}

// State: lowercase 2-char ISO 3166-2 subdivision code (e.g. "ca").
async function hashState(value: string | null): Promise<string | null> {
  if (!value) return null;
  const norm = value.trim().toLowerCase();
  return norm ? sha256Raw(norm) : null;
}

// Zip: US 5-digit only. Strip +4 extension and non-digits.
async function hashZip(value: string | null): Promise<string | null> {
  if (!value) return null;
  const digits = value.replace(/\D/g, "").slice(0, 5);
  return digits.length === 5 ? sha256Raw(digits) : null;
}

// Country: lowercase ISO 3166-1 alpha-2 ("US" -> "us").
async function hashCountry(value: string | null): Promise<string | null> {
  if (!value) return null;
  const norm = value.trim().toLowerCase();
  return /^[a-z]{2}$/.test(norm) ? sha256Raw(norm) : null;
}

// ── BigQuery: look up FB match params for a click_id ──

export interface ClickMatchRow {
  fbc: string | null;
  fbp: string | null;
  client_ip_address: string | null;
  client_user_agent: string | null;
  event_source_url: string | null;
  event_time_epoch: number | null;
  placement: string | null;
  geo_city: string | null;
  geo_region: string | null;          // ISO 3166-2 subdivision code (e.g. "CA")
  geo_postal_code: string | null;
  geo_country: string | null;         // ISO 3166-1 alpha-2 (e.g. "US")
}

async function lookupClickMatchParams(
  accessToken: string,
  clickId: string
): Promise<ClickMatchRow | null> {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/queries`;

  // click_events is partitioned/clustered on uid + event_time.
  // 7-day lookback is generous; upper-funnel events almost always
  // fire within minutes-to-hours of the click.
  // placement column was added as part of the AN filtering work.
  // COALESCE falls back to parsing s1pplacement from the dest URL
  // for older rows that predate the schema change.
  const query = `
    SELECT
      fbc,
      fbp,
      client_ip AS client_ip_address,
      ua AS client_user_agent,
      event_source_url,
      UNIX_SECONDS(event_time) AS event_time_epoch,
      COALESCE(
        placement,
        REGEXP_EXTRACT(dest, r's1pplacement=([^&]+)')
      ) AS placement,
      -- Per-click geo from Netlify edge context.geo (added 2026-04-29).
      -- Older click rows pre-deploy have NULL — the helper will skip
      -- those fields rather than send empty/bad data.
      geo_city,
      geo_region,
      geo_postal_code,
      geo_country
    FROM \`${BQ_PROJECT}.rsoc_clicks.click_events\`
    WHERE uid = @click_id
      AND event_time >= TIMESTAMP(DATE_SUB(CURRENT_DATE('UTC'), INTERVAL 7 DAY))
    ORDER BY event_time DESC
    LIMIT 1
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
      queryParameters: [
        {
          name: "click_id",
          parameterType: { type: "STRING" },
          parameterValue: { value: clickId },
        },
      ],
      maxResults: 1,
    }),
  });

  if (!res.ok) {
    throw new Error(`BigQuery lookup failed (${res.status}): ${await res.text()}`);
  }

  const result = (await res.json()) as {
    rows?: Array<{ f: Array<{ v: string | null }> }>;
    schema?: { fields: Array<{ name: string }> };
  };

  if (!result.rows || result.rows.length === 0) return null;

  const fields = result.schema!.fields.map((f) => f.name);
  const obj: Record<string, string | null> = {};
  result.rows[0].f.forEach((cell, i) => {
    obj[fields[i]] = cell.v;
  });

  return {
    fbc: obj.fbc,
    fbp: obj.fbp,
    client_ip_address: obj.client_ip_address,
    client_user_agent: obj.client_user_agent,
    event_source_url: obj.event_source_url,
    event_time_epoch: obj.event_time_epoch ? parseInt(obj.event_time_epoch, 10) : null,
    placement: obj.placement || null,
    geo_city: obj.geo_city,
    geo_region: obj.geo_region,
    geo_postal_code: obj.geo_postal_code,
    geo_country: obj.geo_country,
  };
}

// ── BigQuery: write to unified upper-funnel log ──

export async function insertLogRow(
  accessToken: string,
  row: Record<string, unknown>
): Promise<void> {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/datasets/${BQ_DATASET}/tables/${LOG_TABLE}/insertAll`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rows: [{ json: row }] }),
  });

  if (!res.ok) {
    throw new Error(`Log insert failed (${res.status}): ${await res.text()}`);
  }

  const result = (await res.json()) as {
    insertErrors?: Array<{ errors: Array<{ message: string }> }>;
  };
  if (result.insertErrors?.length) {
    throw new Error(`Log insert errors: ${JSON.stringify(result.insertErrors)}`);
  }
}

// ── Meta CAPI fire ──

export interface CapiEvent {
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
    country?: string;
    ct?: string;        // hashed city
    st?: string;        // hashed state (subdivision code)
    zp?: string;        // hashed zip
  };
  custom_data?: {
    content_category?: string;
    search_string?: string;
  };
  data_processing_options?: string[];
}

// (Removed 2026-04-29) The previous getHashedUsCountry() helper is gone —
// country now comes per-click from match.geo_country (Netlify edge MaxMind
// lookup, persisted on click_events). hashCountry() handles normalization
// and skips the field when geo couldn't be resolved.


// ── BigQuery: batched streaming insert (queue + batched log writes) ──
// insertId gives best-effort dedupe if the same row is retried within
// BigQuery's dedupe window.

export async function insertRows(
  accessToken: string,
  table: string,
  rows: Array<{ insertId?: string; json: Record<string, unknown> }>
): Promise<void> {
  if (rows.length === 0) return;
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/datasets/${BQ_DATASET}/tables/${table}/insertAll`;

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rows: chunk }),
    });
    if (!res.ok) {
      throw new Error(`${table} insert failed (${res.status}): ${await res.text()}`);
    }
    const result = (await res.json()) as {
      insertErrors?: Array<{ index: number; errors: Array<{ message: string }> }>;
    };
    if (result.insertErrors?.length) {
      throw new Error(`${table} insert errors: ${JSON.stringify(result.insertErrors)}`);
    }
  }
}

// ── Meta CAPI fire (accepts up to 1000 events per request) ──

export async function fireCapiEvents(
  pixelId: string,
  accessToken: string,
  events: CapiEvent[]
): Promise<{ fbtrace_id: string; events_received: number }> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: events, access_token: accessToken }),
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

// ── Build the CAPI event (shared by instant and queued paths) ──

export interface UpperFunnelEventInput {
  eventName: string;
  eventId: string;
  clickId: string;
  rawParams: Record<string, string>;
  /** When S1 pinged us (epoch seconds). Instant mode passes "now". */
  receivedEpoch: number;
}

export async function buildCapiEvent(
  ev: UpperFunnelEventInput,
  match: ClickMatchRow
): Promise<CapiEvent> {
  // event_time: when S1 pinged us. Floor at click_time + 1 as a safety
  // rail — Meta rejects events whose event_time is earlier than the click.
  const eventTime = match.event_time_epoch
    ? Math.max(ev.receivedEpoch, match.event_time_epoch + 1)
    : ev.receivedEpoch;

  // external_id: sha256(fbp) so repeat visitors from the same browser get a
  // stable identifier; fall back to sha256(click_id) if fbp is missing.
  const hashedExternalId = match.fbp
    ? await sha256(match.fbp)
    : await sha256(ev.clickId);

  const hashedCountry = await hashCountry(match.geo_country);
  const hashedCity    = await hashCity(match.geo_city);
  const hashedState   = await hashState(match.geo_region);
  const hashedZip     = await hashZip(match.geo_postal_code);

  // Event-specific custom_data:
  //   Lead   → content_category (ad vertical)
  //   Search → search_string (the query the user typed)
  const category = ev.rawParams.cat?.trim();
  const searchString = ev.rawParams.q?.trim();
  const customData: { content_category?: string; search_string?: string } = {};
  if (ev.eventName === "Lead" && category) customData.content_category = category;
  if (ev.eventName === "Search" && searchString) customData.search_string = searchString;

  return {
    event_name: ev.eventName,
    event_time: eventTime,
    event_id: ev.eventId,
    event_source_url: match.event_source_url || "https://search.etoptip.com/",
    action_source: "website",
    user_data: {
      ...(match.fbc && { fbc: match.fbc }),
      ...(match.fbp && { fbp: match.fbp }),
      ...(match.client_ip_address && { client_ip_address: match.client_ip_address }),
      ...(match.client_user_agent && { client_user_agent: match.client_user_agent }),
      external_id: hashedExternalId,
      ...(hashedCountry && { country: hashedCountry }),
      ...(hashedCity    && { ct: hashedCity }),
      ...(hashedState   && { st: hashedState }),
      ...(hashedZip     && { zp: hashedZip }),
    },
    // Explicit empty LDU array: "no Limited Data Use restrictions apply".
    data_processing_options: [],
    ...(Object.keys(customData).length > 0 && { custom_data: customData }),
  };
}

/**
 * Why an event can't be sent, or null if it can. Shared so instant and
 * queued modes skip exactly the same events with the same log status.
 */
export function skipReason(match: ClickMatchRow | null): string | null {
  if (!match) return "skipped_no_click";
  if (!match.fbc && !match.fbp) return "skipped_no_match";
  // Audience Network safety net. The edge function already strips
  // upper-funnel postback URLs for AN traffic; this catches leaks.
  if (match.placement && match.placement.toLowerCase().startsWith("an")) {
    return "skipped_an_placement";
  }
  return null;
}

/** Log row in the s1_capi_upper_funnel_log schema. */
export function logRow(
  ev: UpperFunnelEventInput,
  status: string,
  extra: {
    event?: CapiEvent;
    match?: ClickMatchRow | null;
    pixelId?: string;
    fbtraceId?: string;
  } = {}
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    sent_at: Date.now() / 1000,
    event_date_utc: new Date(ev.receivedEpoch * 1000).toISOString().slice(0, 10),
    event_name: ev.eventName,
    uid: ev.clickId,
    event_id: ev.eventId,
    status,
    raw_params: JSON.stringify(ev.rawParams),
  };
  if (status !== "sent" || !extra.event) return base;
  const m = extra.match!;
  return {
    ...base,
    event_time_epoch: extra.event.event_time,
    fbc: m.fbc || "",
    fbp: m.fbp || "",
    client_ip_address: m.client_ip_address || "",
    client_user_agent: m.client_user_agent || "",
    event_source_url: extra.event.event_source_url,
    pixel_id: extra.pixelId || "",
    fbtrace_id: extra.fbtraceId || "",
  };
}

// ── Public: receiver entry point ──

export interface InstantEventConfig {
  /** Meta standard event name: "Lead" | "PageView" | "Search" */
  eventName: string;
  /**
   * Suffix appended to click_id for the event_id. The final event_id is
   * `${clickId}${suffix}_${receivedMs}`: one click can produce several
   * searches and several ad clicks, and each is its own event. A per-click
   * ID made Meta keep only the first one (it dedupes on event_id for 48h).
   */
  eventIdSuffix: string;
  /** S1 click_id extracted from the incoming postback URL */
  clickId: string;
  /** Pre-parsed URL so we can pass the raw params through to the log */
  rawParams: Record<string, string>;
}

/** One event_id per S1 ping. See InstantEventConfig.eventIdSuffix. */
export function makeEventId(cfg: InstantEventConfig, receivedMs: number): string {
  return `${cfg.clickId}${cfg.eventIdSuffix}_${receivedMs}`;
}

/**
 * UPPER_FUNNEL_MODE (Netlify env var):
 *   "queue"   (default) append to s1_capi_upper_funnel_queue; the 5-minute
 *             s1-capi-upper-funnel-sender sweep looks up clicks and fires
 *             CAPI in bulk. One BigQuery query per sweep instead of one per
 *             event (the per-event lookup was ~99% of the BigQuery bill).
 *   "instant" legacy path: per-event click lookup + immediate CAPI fire.
 *             Kept as a rollback switch.
 */
export async function routeInstantEvent(
  cfg: InstantEventConfig,
  context: Context
): Promise<Response> {
  const mode = (Netlify.env.get("UPPER_FUNNEL_MODE") || "queue").toLowerCase();
  return mode === "instant"
    ? handleInstantEvent(cfg, context)
    : enqueueInstantEvent(cfg, context);
}

export async function enqueueInstantEvent(
  cfg: InstantEventConfig,
  context: Context
): Promise<Response> {
  const logPrefix = `s1-${cfg.eventName.toLowerCase()}`;
  const receivedAt = new Date();

  if (!cfg.clickId) {
    console.warn(`${logPrefix}: missing click_id`, { params: cfg.rawParams });
    return new Response("OK", { status: 200 });
  }

  context.waitUntil(
    (async () => {
      const row = {
        received_at: receivedAt.toISOString(),
        event_name: cfg.eventName,
        uid: cfg.clickId,
        event_id: makeEventId(cfg, receivedAt.getTime()),
        raw_params: JSON.stringify(cfg.rawParams),
      };
      // Cached token + retries; if BigQuery still refuses, the row is parked
      // in the pending store and s1-bq-pending-replay inserts it later
      // (the sweep looks back UF_QUEUE_LOOKBACK_HOURS, default 12).
      const r = await insertOrPark({
        saKeyRaw: Netlify.env.get("GCP_SERVICE_ACCOUNT_KEY"),
        scope: SCOPE_BQ,
        dataset: BQ_DATASET,
        table: QUEUE_TABLE,
        rows: [{ insertId: row.event_id, json: row }],
        source: logPrefix,
      });
      if (r !== "inserted") console.warn(`${logPrefix}: enqueue ${r}`, row.event_id);
    })()
  );

  return new Response("OK", { status: 200 });
}

/** Legacy instant path (UPPER_FUNNEL_MODE=instant). Behavior unchanged. */
export async function handleInstantEvent(
  cfg: InstantEventConfig,
  context: Context
): Promise<Response> {
  const logPrefix = `s1-${cfg.eventName.toLowerCase()}`;

  if (!cfg.clickId) {
    console.warn(`${logPrefix}: missing click_id`, { params: cfg.rawParams });
    return new Response("OK", { status: 200 });
  }

  // Fire-and-log runs async so we return 200 to S1 immediately
  context.waitUntil(
    (async () => {
      const saKeyRaw = Netlify.env.get("GCP_SERVICE_ACCOUNT_KEY");
      const pixelId = Netlify.env.get("META_PIXEL_ID");
      const metaToken = Netlify.env.get("META_ACCESS_TOKEN");

      if (!saKeyRaw || !pixelId || !metaToken) {
        console.error(`${logPrefix}: missing env vars`, {
          hasGcp: !!saKeyRaw,
          hasPixel: !!pixelId,
          hasMetaToken: !!metaToken,
        });
        return;
      }

      const receivedMs = Date.now();
      const ev: UpperFunnelEventInput = {
        eventName: cfg.eventName,
        eventId: makeEventId(cfg, receivedMs),
        clickId: cfg.clickId,
        rawParams: cfg.rawParams,
        receivedEpoch: Math.floor(receivedMs / 1000),
      };

      try {
        const bqToken = await getAccessToken(
          JSON.parse(saKeyRaw),
          "https://www.googleapis.com/auth/bigquery"
        );

        const match = await lookupClickMatchParams(bqToken, cfg.clickId);
        const skip = skipReason(match);
        if (skip) {
          console.warn(`${logPrefix}: ${cfg.clickId} ${skip}`);
          await insertLogRow(bqToken, logRow(ev, skip));
          return;
        }

        const event = await buildCapiEvent(ev, match!);
        const fireResult = await fireCapiEvents(pixelId, metaToken, [event]);
        console.log(
          `${logPrefix}: fired ${cfg.eventName} for ${cfg.clickId}, ` +
            `fbtrace_id=${fireResult.fbtrace_id}`
        );

        await insertLogRow(
          bqToken,
          logRow(ev, "sent", { event, match, pixelId, fbtraceId: fireResult.fbtrace_id })
        );
      } catch (err: any) {
        console.error(`${logPrefix}: fire/log failed:`, err?.message || err);
      }
    })()
  );

  return new Response("OK", { status: 200 });
}
