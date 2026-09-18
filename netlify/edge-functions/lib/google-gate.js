/**
 * google-gate.js
 *
 * Keeps Google out of the redirect funnel entirely: no LP, no click_events row,
 * no CAPI event. Two independent checks, either one is enough to trigger.
 *
 *   1. User agent. Googlebot and friends identify themselves honestly and do
 *      not spoof, so this catches the overwhelming majority at zero cost.
 *
 *   2. Client IP against Google's own published CIDR lists. This is the closest
 *      thing to the "ISP contains google" rule, because Netlify's edge context
 *      exposes context.ip and context.geo but no ISP or ASN string. There is no
 *      ISP field at the edge to pattern match against, so we match the ranges
 *      Google itself publishes instead: the crawler range files plus Google's
 *      corp_external geofeed, which is the "Google Corporate Office" ISP label
 *      (ARIN net name GOOGLE-CORP, RIPE org "Google Corp Network").
 *
 * Ranges are regenerated at build time by scripts/build-google-ranges.mjs.
 *
 * LOADED DYNAMICALLY by the 0c block in redirect.js (and in the Sheets
 * template that generates it), inside a try/catch. redirect.js is regenerated
 * wholesale on every Sheet push, so the gate lives in the TEMPLATE, not in the
 * generated file. If this module is ever missing from a deploy the gate falls
 * back to its inline user-agent check rather than throwing, because the edge
 * function is bound to /* and a hard import failure would take the whole
 * redirector offline.
 */

import { GOOGLE_V4, GOOGLE_V6 } from "./google-ranges.js";

// Named Google crawlers and fetchers only.
//
// There is deliberately NO generic \bgoogle\b fallback. It was in an earlier
// version and it was wrong: the Instagram in-app browser on Pixel devices puts
// the device manufacturer in its UA ("... Android (37/17; 420dpi; 1080x2424;
// Google/goo...)"), so the fallback matched real users arriving from Instagram
// ads. Measured against S1's 22-day export it caught 56 revenue-earning
// consumer sessions. Every token below must name an actual crawler.
const GOOGLE_UA =
  /(googlebot|googleother|adsbot-google|mediapartners-google|apis-google|feedfetcher-google|google-inspectiontool|google-extended|google-safety|google-read-aloud|storebot-google|googleweblight|google favicon|google-site-verification|google web preview|google-adwords-express|google-structured-data-testing-tool|google-certificates-bridge|^google$|^google\/)/i;

export function isGoogleUA(ua) {
  return GOOGLE_UA.test(ua || "");
}

// ── IP parsing ──

function v4ToBig(addr) {
  const parts = addr.split(".");
  if (parts.length !== 4) return null;
  let acc = 0n;
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255 || p === "") return null;
    acc = (acc << 8n) | BigInt(n);
  }
  return acc;
}

function v6ToBig(addr) {
  try {
    let s = addr;
    const v4tail = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
    if (v4tail) {
      const n = v4ToBig(v4tail[1]);
      if (n === null) return null;
      s =
        s.slice(0, v4tail.index) +
        ((n >> 16n) & 0xffffn).toString(16) +
        ":" +
        (n & 0xffffn).toString(16);
    }
    const dbl = s.split("::");
    if (dbl.length > 2) return null;
    const head = dbl[0] ? dbl[0].split(":").filter(Boolean) : [];
    const tail = dbl.length === 2 && dbl[1] ? dbl[1].split(":").filter(Boolean) : [];
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    const groups = [...head, ...Array(dbl.length === 2 ? fill : 0).fill("0"), ...tail];
    if (groups.length !== 8) return null;
    let acc = 0n;
    for (const g of groups) {
      const n = parseInt(g, 16);
      if (Number.isNaN(n) || n < 0 || n > 0xffff) return null;
      acc = (acc << 16n) | BigInt(n);
    }
    return acc;
  } catch {
    return null;
  }
}

// ── Binary search over sorted, merged, non-overlapping ranges ──

function inRanges(ranges, value) {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [s, e] = ranges[mid];
    if (value < s) hi = mid - 1;
    else if (value > e) lo = mid + 1;
    else return true;
  }
  return false;
}

export function isGoogleIP(ip) {
  if (!ip) return false;
  const addr = String(ip).trim().replace(/^\[|\]$/g, "");
  if (!addr) return false;
  if (addr.includes(":")) {
    const n = v6ToBig(addr);
    if (n === null) return false;
    // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible addresses carry a v4
    // address in the low 32 bits. Those must be matched against the v4 table,
    // not the v6 one. Netlify normally hands us a bare v4 string, but a proxy
    // hop can produce the mapped form and it would silently miss otherwise.
    const V4_MAPPED = 0xffffn << 32n; // ::ffff:0:0/96
    if (n >> 32n === V4_MAPPED >> 32n) return inRanges(GOOGLE_V4, n & 0xffffffffn);
    return inRanges(GOOGLE_V6, n);
  }
  const n = v4ToBig(addr);
  return n === null ? false : inRanges(GOOGLE_V4, n);
}

/**
 * Single entry point for redirect.js.
 * Returns null when the request is not Google, or a reason string when it is.
 */
export function googleReason(ua, ip) {
  if (isGoogleUA(ua)) return "google_ua";
  if (isGoogleIP(ip)) return "google_ip";
  return null;
}
