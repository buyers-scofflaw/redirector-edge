#!/usr/bin/env node
/**
 * build-google-ranges.mjs
 *
 * Generates netlify/edge-functions/lib/google-ranges.js from Google's own
 * published CIDR lists. Run this on every deploy (see netlify.toml build cmd)
 * so the list never goes stale.
 *
 * Sources (all public, no auth):
 *   googlebot.json        - Googlebot crawler ranges
 *   special-crawlers.json - AdsBot, Mediapartners, InspectionTool, etc.
 *   corp_external         - Google's self-published RFC 8805 geofeed for their
 *                           CORPORATE network (ARIN net name GOOGLE-CORP,
 *                           RIPE org "Google Corp Network"). This is the
 *                           "Google Corporate Office" ISP label, exactly.
 *                           7,361 prefixes but only ~51k IPv4 addresses, so it
 *                           is surgical rather than broad.
 *
 * NOT used for the corporate case: goog.json. It looks like the right file and
 * is not. It omits 104.132.0.0/14 (GOOGLE-CORP, where the sample corporate hits
 * actually came from) while publishing coarse aggregates like 34.64.0.0/10 that
 * swallow Google Cloud whole: 24.2M IPv4 addresses, 79% of them inside
 * cloud.json. It is the wrong shape in both directions. Set INCLUDE_GCP=true if
 * you separately want to block all of Google Cloud as datacenter insurance;
 * that is a different decision from blocking Google.
 *
 * The /api/* postback receivers bypass the edge function entirely (see the path
 * check at the top of redirect.js), so nothing here can break S1's postbacks
 * even if S1 or a partner runs on GCP.
 *
 * Deliberately NOT included: user-triggered-fetchers*.json. Those are fetches a
 * human initiated from a Google product (1,058 + 496 prefixes). They are not
 * crawling us on Google's own initiative and the ranges are broad.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const INCLUDE_CORP = process.env.INCLUDE_CORP !== "false"; // default on
const INCLUDE_GCP  = process.env.INCLUDE_GCP === "true";   // default off

const SOURCES = [
  { tag: "googlebot", kind: "json", url: "https://developers.google.com/search/apis/ipranges/googlebot.json" },
  { tag: "special",   kind: "json", url: "https://developers.google.com/search/apis/ipranges/special-crawlers.json" },
  ...(INCLUDE_CORP
    ? [{ tag: "corp", kind: "geofeed", url: "https://www.gstatic.com/geofeed/corp_external" }]
    : []),
  ...(INCLUDE_GCP
    ? [{ tag: "gcp", kind: "json", url: "https://www.gstatic.com/ipranges/cloud.json" }]
    : []),
];

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../netlify/edge-functions/lib/google-ranges.js"
);

// ── CIDR -> [startBigInt, endBigInt] ──

function v4ToBig(addr) {
  const parts = addr.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    throw new Error(`bad ipv4: ${addr}`);
  }
  return parts.reduce((acc, n) => (acc << 8n) | BigInt(n), 0n);
}

function v6ToBig(addr) {
  // Handle :: compression and embedded IPv4 (e.g. ::ffff:1.2.3.4)
  let s = addr;
  const v4tail = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4tail) {
    const n = v4ToBig(v4tail[1]);
    const hi = (n >> 16n) & 0xffffn;
    const lo = n & 0xffffn;
    s = s.slice(0, v4tail.index) + hi.toString(16) + ":" + lo.toString(16);
  }
  const [head, tail] = s.split("::");
  const headGroups = head ? head.split(":").filter(Boolean) : [];
  const tailGroups = tail !== undefined && tail ? tail.split(":").filter(Boolean) : [];
  const fill = 8 - headGroups.length - tailGroups.length;
  if (fill < 0) throw new Error(`bad ipv6: ${addr}`);
  const groups = [
    ...headGroups,
    ...Array(tail !== undefined ? fill : 0).fill("0"),
    ...tailGroups,
  ];
  if (groups.length !== 8) throw new Error(`bad ipv6: ${addr}`);
  return groups.reduce((acc, g) => (acc << 16n) | BigInt(parseInt(g, 16) || 0), 0n);
}

function cidrToRange(cidr, isV6) {
  const [addr, bitsRaw] = cidr.split("/");
  const width = isV6 ? 128n : 32n;
  const bits = BigInt(bitsRaw);
  if (bits < 0n || bits > width) throw new Error(`bad prefix length: ${cidr}`);
  const base = isV6 ? v6ToBig(addr) : v4ToBig(addr);
  const hostBits = width - bits;
  const mask = ((1n << bits) - 1n) << hostBits;
  const start = base & mask;
  const end = start | ((1n << hostBits) - 1n);
  return [start, end];
}

// ── Merge overlapping/adjacent ranges so the binary search stays correct ──

function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1] + 1n) {
      if (e > last[1]) last[1] = e;
    } else {
      out.push([s, e]);
    }
  }
  return out;
}

// ── Main ──
//
// FAIL-SOFT. google-ranges.js is committed to the repo, so the gate works with
// the last-known-good list even if this never runs. If anything here fails
// (Google unreachable, a truncated file, a network blip in the Netlify build)
// we log loudly, leave the committed file alone, and exit 0. A stale range list
// is a far better outcome than a failed deploy on a redirector that carries
// live ad spend. Set STRICT_RANGES=true to fail the build instead.

const STRICT = process.env.STRICT_RANGES === "true";

function bail(msg) {
  if (STRICT) throw new Error(msg);
  console.error(`\n  !! google-ranges: ${msg}`);
  console.error("  !! keeping the committed google-ranges.js (last known good).");
  console.error("  !! the gate still works; the list is just not refreshed.\n");
  process.exit(0);
}

const v4 = [];
const v6 = [];
const counts = {};

for (const { tag, kind, url } of SOURCES) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  } catch (err) {
    bail(`${tag}: fetch failed for ${url} (${err?.message || err})`);
  }
  if (!res.ok) bail(`${tag}: HTTP ${res.status} from ${url}`);
  const body = await res.text();
  const cidrs = [];

  if (kind === "json") {
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      // developers.google.com serves an HTML doc page if the path is wrong.
      bail(`${tag}: ${url} did not return JSON (got ${body.slice(0, 40)}...)`);
    }
    if (!Array.isArray(data.prefixes) || data.prefixes.length === 0) {
      bail(`${tag}: no prefixes in ${url}`);
    }
    for (const p of data.prefixes) {
      if (p.ipv4Prefix) cidrs.push(p.ipv4Prefix);
      else if (p.ipv6Prefix) cidrs.push(p.ipv6Prefix);
    }
  } else {
    // RFC 8805 geofeed: "prefix,country,region,city" with # comments.
    for (const line of body.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || t.startsWith("<")) continue;
      const first = t.split(",")[0].trim();
      if (first.includes("/")) cidrs.push(first);
    }
    if (cidrs.length === 0) bail(`${tag}: no prefixes parsed from ${url}`);
  }

  counts[tag] = cidrs.length;
  for (const c of cidrs) {
    if (c.includes(":")) v6.push(cidrToRange(c, true));
    else v4.push(cidrToRange(c, false));
  }
}

const v4m = mergeRanges(v4);
const v6m = mergeRanges(v6);

// Sanity floor on the RAW prefix counts, not the merged ones. Google publishes
// long runs of adjacent /64s, so merging legitimately collapses ~470 v4 and
// ~300 v6 prefixes down to roughly 100 and 15. Checking the merged counts would
// trip on normal input. The raw counts are the real staleness signal: if Google
// serves a truncated or empty file we want the build to fail loudly rather than
// silently ship a blocklist that matches nothing.
if (v4.length < 250 || v6.length < 200) {
  bail(`suspiciously small input: ${v4.length} raw v4, ${v6.length} raw v6`);
}

const fmt = (rs) => rs.map(([s, e]) => `[${s}n,${e}n]`).join(",\n  ");

const out = `// GENERATED by scripts/build-google-ranges.mjs - do not edit by hand.
// Built: ${new Date().toISOString()}
// Sources: ${SOURCES.map((s) => `${s.tag}=${counts[s.tag]}`).join(", ")} raw prefixes
// Merged: ${v4m.length} IPv4 ranges, ${v6m.length} IPv6 ranges

export const GOOGLE_V4 = [
  ${fmt(v4m)}
];

export const GOOGLE_V6 = [
  ${fmt(v6m)}
];
`;

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, out, "utf8");

console.log(
  `google-ranges.js written: ${v4m.length} IPv4 ranges, ${v6m.length} IPv6 ranges ` +
    `(from ${Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(" ")})`
);
