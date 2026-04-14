/**
 * S1 LEAD RECEIVER — Instant "Lead" CAPI fire
 *
 * Receives click_track_url pings from System1 and fires a Meta "Lead"
 * event to Conversions API within milliseconds. This is the instant-
 * fire signal campaigns will optimize on (Maximize Conversions → Lead).
 *
 * Responds 200 immediately; CAPI fire runs async via context.waitUntil.
 *
 * S1 URL template (configure in System1 console):
 *   https://<your-redirector>/api/s1-lead?click_id={click_id}
 *
 * Deploy: Place in netlify/functions/s1-lead.mts
 */

import type { Context, Config } from "@netlify/functions";
import { handleInstantEvent } from "./s1-capi-helpers.mts";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const click_id = url.searchParams.get("click_id") || "";
  const rawParams = Object.fromEntries(url.searchParams.entries());

  return handleInstantEvent(
    {
      eventName: "Lead",
      eventIdSuffix: "_lead",
      clickId: click_id,
      rawParams,
    },
    context
  );
};

export const config: Config = {
  path: "/api/s1-lead",
};
