/**
 * SHARED CAPI HELPERS
 *
 * Used by the three instant-fire upper-funnel receivers:
 *   - s1-lead.mts         (Meta "Lead" event on click_track_url)
 *   - s1-impression.mts   (Meta "PageView" event on impression_track_url)
 *   - s1-search.mts       (Meta "Search" event on search_track_url)
 *
 * Architecture: S1 pings a receiver URL on each funnel event. The receiver
 * responds 200 immediately, then (via context.waitUntil) looks up the
 * FB match params for the click_id and fires a CAPI event to Meta. All
 * fires are logged to s1_capi_upper_funnel_log for auditing.
 *
 * Purchase events still flow through s1-postback.mts + s1-capi-sender.mts
 * on the existing 15-minute cron — this pipeline is for upper-funnel only.
 *
 * ENV VARS REQUIRED:
 *   GCP_SERVICE_ACCOUNT_KEY - Full JSON service account key
 *   META_PIXEL_ID           - Facebook pixel ID
 *   META_ACCESS_TOKEN       - Facebook Conversions API access token
 */

import type { Context } from "@netlify/functions";

// ── Config ──
const BQ_PROJECT = "carbon-storm-422904-n0";
const BQ_DATASET = "my_dataset";
const LOG_TABLE = "s1_capi_upper_funnel_log";
const GRAPH_VERSION = "v19.0";

// ── JWT / Google Auth ──

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
    throw new Error(`Google OAuth failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

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

interface ClickMatchRow {
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

async function insertLogRow(
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

async function fireCapiEvent(
  pixelId: string,
  accessToken: string,
  event: CapiEvent
): Promise<{ fbtrace_id: string; events_received: number }> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event], access_token: accessToken }),
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

// ── Public: handle an instant-fire upper-funnel event ──

export interface InstantEventConfig {
  /** Meta standard event name: "Lead" | "PageView" | "Search" */
  eventName: string;
  /** Suffix appended to click_id for the event_id (ensures uniqueness across event types) */
  eventIdSuffix: string;
  /** S1 click_id extracted from the incoming postback URL */
  clickId: string;
  /** Pre-parsed URL so we can pass the raw params through to the log */
  rawParams: Record<string, string>;
}

export async function handleInstantEvent(
  cfg: InstantEventConfig,
  context: Context
): Promise<Response> {
  const logPrefix = `s1-${cfg.eventName.toLowerCase()}`;
  const receivedAt = new Date().toISOString();

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

      try {
        const saKey = JSON.parse(saKeyRaw);
        const bqToken = await getAccessToken(
          saKey,
          "https://www.googleapis.com/auth/bigquery"
        );

        // 1. Look up the FB match params for this click
        const match = await lookupClickMatchParams(bqToken, cfg.clickId);

        if (!match) {
          console.warn(`${logPrefix}: no click_events row for ${cfg.clickId}`);
          await insertLogRow(bqToken, {
            sent_at: Date.now() / 1000,
            event_name: cfg.eventName,
            uid: cfg.clickId,
            event_id: `${cfg.clickId}${cfg.eventIdSuffix}`,
            status: "skipped_no_click",
            raw_params: JSON.stringify(cfg.rawParams),
          });
          return;
        }

        if (!match.fbc && !match.fbp) {
          console.warn(
            `${logPrefix}: ${cfg.clickId} has no fbc/fbp — skipping CAPI fire`
          );
          await insertLogRow(bqToken, {
            sent_at: Date.now() / 1000,
            event_name: cfg.eventName,
            uid: cfg.clickId,
            event_id: `${cfg.clickId}${cfg.eventIdSuffix}`,
            status: "skipped_no_match",
            raw_params: JSON.stringify(cfg.rawParams),
          });
          return;
        }

        // 1b. Audience Network filter (safety net)
        // The edge function already strips upper-funnel postback URLs for
        // AN traffic, so this should rarely fire. But if a postback slips
        // through (macro didn't resolve, cached redirect, etc.), block it
        // here. We still allow Purchase events via s1-postback.mts — this
        // filter only applies to upper-funnel receivers.
        if (match.placement && match.placement.toLowerCase().startsWith("an")) {
          console.warn(
            `${logPrefix}: ${cfg.clickId} is Audience Network (${match.placement}) — skipping CAPI fire`
          );
          await insertLogRow(bqToken, {
            sent_at: Date.now() / 1000,
            event_name: cfg.eventName,
            uid: cfg.clickId,
            event_id: `${cfg.clickId}${cfg.eventIdSuffix}`,
            status: "skipped_an_placement",
            placement: match.placement,
            raw_params: JSON.stringify(cfg.rawParams),
          });
          return;
        }

        // 2. Build the CAPI event
        // event_time: use NOW (the postback fired just now). Floor at
        // click_time + 1 as a safety rail — Meta rejects events whose
        // event_time is earlier than the associated click.
        const now = Math.floor(Date.now() / 1000);
        const eventTime = match.event_time_epoch
          ? Math.max(now, match.event_time_epoch + 1)
          : now;

        // external_id: use sha256(fbp) so repeat visitors from the same browser
        // get a stable identifier Meta can cross-reference across sessions.
        // Fall back to sha256(click_id) only if fbp is somehow missing — still
        // better than omitting external_id entirely.
        const hashedExternalId = match.fbp
          ? await sha256(match.fbp)
          : await sha256(cfg.clickId);

        // Geo from the click row — each helper returns null when input is
        // missing/invalid, and the spread guards below skip null fields.
        const hashedCountry = await hashCountry(match.geo_country);
        const hashedCity    = await hashCity(match.geo_city);
        const hashedState   = await hashState(match.geo_region);
        const hashedZip     = await hashZip(match.geo_postal_code);

        // Event-specific custom_data:
        //   Lead   → content_category (ad vertical: insurance/loans/solar/etc.)
        //   Search → search_string (the actual search query the user typed)
        const category = cfg.rawParams.cat?.trim();
        const searchString = cfg.rawParams.q?.trim();
        const customData: { content_category?: string; search_string?: string } = {};
        if (cfg.eventName === "Lead" && category) {
          customData.content_category = category;
        }
        if (cfg.eventName === "Search" && searchString) {
          customData.search_string = searchString;
        }

        const event: CapiEvent = {
          event_name: cfg.eventName,
          event_time: eventTime,
          event_id: `${cfg.clickId}${cfg.eventIdSuffix}`,
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
          // Explicit empty LDU array tells Meta "no Limited Data Use restrictions
          // apply" — avoids ambiguity with CCPA-sensitive traffic.
          data_processing_options: [],
          ...(Object.keys(customData).length > 0 && { custom_data: customData }),
        };

        // 3. Fire to Meta
        const fireResult = await fireCapiEvent(pixelId, metaToken, event);
        console.log(
          `${logPrefix}: fired ${cfg.eventName} for ${cfg.clickId}, ` +
            `fbtrace_id=${fireResult.fbtrace_id}`
        );

        // 4. Log success
        await insertLogRow(bqToken, {
          sent_at: Date.now() / 1000,
          event_date_utc: receivedAt.slice(0, 10),
          event_name: cfg.eventName,
          uid: cfg.clickId,
          event_id: event.event_id,
          event_time_epoch: eventTime,
          fbc: match.fbc || "",
          fbp: match.fbp || "",
          client_ip_address: match.client_ip_address || "",
          client_user_agent: match.client_user_agent || "",
          event_source_url: event.event_source_url,
          pixel_id: pixelId,
          fbtrace_id: fireResult.fbtrace_id,
          status: "sent",
          raw_params: JSON.stringify(cfg.rawParams),
        });
      } catch (err: any) {
        console.error(`${logPrefix}: fire/log failed:`, err?.message || err);
      }
    })()
  );

  return new Response("OK", { status: 200 });
}
