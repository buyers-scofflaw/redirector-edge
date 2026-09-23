/**
 * S1 IMPRESSION RECEIVER — "PageView" CAPI event
 *
 * Receives impression_track_url pings from System1 (fired when the
 * widget page loads after a Meta ad click) and fires a Meta "PageView"
 * event to Conversions API (queued, sent within ~5 min by
 * s1-capi-upper-funnel-sender; see s1-capi-helpers.mts).
 *
 * PageView is the top-of-funnel signal. Not used for campaign
 * optimization directly, but helps Meta's pixel build a full-funnel
 * model and enables accurate attribution reporting.
 *
 * Responds 200 immediately; the enqueue runs async via context.waitUntil.
 *
 * S1 URL template (configure in System1 console):
 *   https://<your-redirector>/api/s1-impression?click_id={click_id}
 *
 * Deploy: Place in netlify/functions/s1-impression.mts
 */

import type { Context, Config } from "@netlify/functions";
import { routeInstantEvent } from "./s1-capi-helpers.mts";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const click_id = url.searchParams.get("click_id") || "";
  const rawParams = Object.fromEntries(url.searchParams.entries());

  return routeInstantEvent(
    {
      eventName: "PageView",
      eventIdSuffix: "_pv",
      clickId: click_id,
      rawParams,
    },
    context
  );
};

export const config: Config = {
  path: "/api/s1-impression",
};
