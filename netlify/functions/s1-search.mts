/**
 * S1 SEARCH RECEIVER — "Search" CAPI event
 *
 * Receives search_track_url pings from System1 (fired when a user
 * enters a search term in the widget) and fires a Meta "Search"
 * event to Conversions API (queued, sent within ~5 min by
 * s1-capi-upper-funnel-sender; see s1-capi-helpers.mts).
 *
 * Search is a mid-funnel signal. Most useful as a secondary quality
 * indicator — campaigns optimized on Lead will also benefit from
 * Search events flowing because Meta's full-funnel modeling improves.
 *
 * Responds 200 immediately; the enqueue runs async via context.waitUntil.
 *
 * S1 URL template (configure in System1 console):
 *   https://<your-redirector>/api/s1-search?click_id={click_id}
 *
 * Deploy: Place in netlify/functions/s1-search.mts
 */

import type { Context, Config } from "@netlify/functions";
import { routeInstantEvent } from "./s1-capi-helpers.mts";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const click_id = url.searchParams.get("click_id") || "";
  const rawParams = Object.fromEntries(url.searchParams.entries());

  return routeInstantEvent(
    {
      eventName: "Search",
      eventIdSuffix: "_search",
      clickId: click_id,
      rawParams,
    },
    context
  );
};

export const config: Config = {
  path: "/api/s1-search",
};
