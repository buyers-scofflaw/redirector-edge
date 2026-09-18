// Run: node scripts/build-google-ranges.mjs && node scripts/test-google-gate.mjs
// The GCP expectations flip with INCLUDE_GOOGLE_SERVICES, so read the header
// of the generated file to know which variant we are asserting against.
import { readFile } from "node:fs/promises";
import { isGoogleIP, isGoogleUA, googleReason } from "../netlify/edge-functions/lib/google-gate.js";

const header = await readFile(
  new URL("../netlify/edge-functions/lib/google-ranges.js", import.meta.url), "utf8"
);
const withCorp = header.includes("corp=");
const withGcp  = header.includes("gcp=");
console.log(`variant: crawlers${withCorp ? " + corp" : ""}${withGcp ? " + gcp" : ""}\n`);

const ip = [
  ["66.249.66.1",           true,           "classic Googlebot /19"],
  ["66.249.79.255",         true,           "Googlebot upper edge"],
  ["2001:4860:4801:10::1",  true,           "Googlebot IPv6"],
  ["2001:4860:4801:2008::1", true,          "special-crawlers IPv6 (AdsBot etc)"],
  ["108.177.2.5",           true,           "special-crawlers v4"],

  ["::ffff:66.249.66.1",    true,           "IPv4-mapped Googlebot"],
  ["104.133.196.46",        withCorp,       "GOOGLE-CORP 104.132.0.0/14 - from Kevin's sample"],
  ["104.135.194.108",       withCorp,       "GOOGLE-CORP - from Kevin's sample"],
  ["104.135.188.65",        withCorp,       "GOOGLE-CORP - from Kevin's sample"],
  ["2a00:79e1:2e00:4e00:accd:95c3:8fb7:489a", withCorp, "Google Corp Network CH - from Kevin's sample"],
  ["66.249.68.164",         true,           "Googlebot 66.249.68.x - from Kevin's sample"],
  ["34.35.0.1",             withGcp,        "GCP customer"],
  ["35.191.8.1",            withGcp,        "GCP load balancer"],
  ["8.8.8.8",               false,          "Google public DNS - a resolver, not a visitor"],
  ["1.1.1.1",               false,          "Cloudflare"],
  ["47.88.20.1",            false,          "Alibaba (the spy crawler ASN)"],
  ["2601:646:100:32d0::1",  false,          "Comcast residential IPv6 (the QA /64)"],
  ["73.202.14.55",          false,          "Comcast residential v4"],
  ["31.13.64.35",           false,          "Meta AS32934 - reviewer path must survive"],
  ["",                      false,          "empty"],
  ["not-an-ip",             false,          "garbage"],
  ["999.1.1.1",             false,          "invalid octet"],
  ["2001:4860:4801:10::/64", false,         "CIDR string, not an address"],
];

const ua = [
  ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", true],
  ["Mozilla/5.0 (compatible; AdsBot-Google; +http://www.google.com/adsbot.html)", true],
  ["Google-InspectionTool/1.0", true],
  ["Mediapartners-Google", true],
  ["Mozilla/5.0 (compatible; Google-Extended)", true],
  ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GoogleOther) Chrome/151.0", true],
  ["Google", true],
  // Regression: the Instagram in-app browser on Pixel puts "Google" in the device
  // field. These are real users from IG ads and must NOT be gated.
  ["Mozilla/5.0 (Linux; Android 17; Pixel 9a Build/CP2A.260805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/153.0.8010.26 Mobile Safari/537.36 Instagram 446.0.0.49.77 Android (37/17; 420dpi; 1080x2424; Google/google; Pixel 9a)", false],
  ["Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36", false],
  ["Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/450.0]", false],
  ["meta-externalads/1.1", false],
  ["Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/69.0.3497.100 Safari/537.36", false],
  ["Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36", false],
  ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Instagram 300.0", false],
  ["", false],
];

let fail = 0;
const row = (ok, got, want, label) => {
  if (!ok) fail++;
  console.log(`  ${ok ? "pass" : "FAIL"}  got=${String(got).padEnd(5)} want=${String(want).padEnd(5)} ${label}`);
};
console.log("IP:");
for (const [v, want, note] of ip) row(isGoogleIP(v) === want, isGoogleIP(v), want, `${v.padEnd(24)} ${note}`);
console.log("UA:");
for (const [v, want] of ua) row(isGoogleUA(v) === want, isGoogleUA(v), want, v.slice(0, 66));
console.log("reason:");
for (const [u, i, want] of [
  ["Googlebot/2.1", "1.1.1.1", "google_ua"],
  ["Chrome/120", "66.249.66.1", "google_ip"],
  ["Chrome/120", "73.202.14.55", null],
]) row(googleReason(u, i) === want, googleReason(u, i), want, `${u} @ ${i}`);

const t0 = performance.now();
for (let i = 0; i < 200000; i++) isGoogleIP("2601:646:100:32d0::1");
console.log(`\n200k worst-case (miss) IPv6 lookups: ${(performance.now() - t0).toFixed(0)}ms`);
console.log(fail === 0 ? "ALL PASS" : `${fail} FAILURES`);
process.exit(fail ? 1 : 0);
