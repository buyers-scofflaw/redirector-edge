/**
 * S1 IMPRESSION RECEIVER — Instant "PageView" CAPI fire
 *
 * Receives impression_track_url pings from System1 (fired when the
 * widget page loads after a Meta ad click) and fires a Meta "PageView"
 * event to Conversions API within milliseconds.
 *
 * PageView is the top-of-funnel signal. Not used for campaign
 * optimization directly, but helps Meta's pixel build a full-funnel
 * model and enables accurate attribution reporting.
 *
 * Responds 200 immediately; CAPI fire runs async via context.waitUntil.
 *
 * S1 URL template (configure in System1 console):
 *   https://<your-redirector>/api/s1-impression?click_id={click_id}
 *
 * Deploy: Place in netlify/functions/s1-impression.mts
 */

import type { Context, Config } from "@netlify/functions";
import { handleInstantEvent } from "./s1-capi-helpers.mts";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const click_id = url.searchParams.get("click_id") || "";
  const rawParams = Object.fromEntries(url.searchParams.entries());

  return handleInstantEvent(
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
