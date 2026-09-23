/**
 * S1 LEAD RECEIVER — "Lead" CAPI event
 *
 * Receives click_track_url pings from System1 and fires a Meta "Lead"
 * event to Conversions API (queued, sent within ~5 min by
 * s1-capi-upper-funnel-sender; see s1-capi-helpers.mts). As of 2026-09
 * every active ad set optimizes on purchase VALUE, not Lead. If a campaign
 * is ever switched to optimize on Lead, reconsider the ~5 min delay.
 *
 * Responds 200 immediately; the enqueue runs async via context.waitUntil.
 *
 * S1 URL template (configure in System1 console):
 *   https://<your-redirector>/api/s1-lead?click_id={click_id}
 *
 * Deploy: Place in netlify/functions/s1-lead.mts
 */

import type { Context, Config } from "@netlify/functions";
import { routeInstantEvent } from "./s1-capi-helpers.mts";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const click_id = url.searchParams.get("click_id") || "";
  const rawParams = Object.fromEntries(url.searchParams.entries());

  return routeInstantEvent(
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
