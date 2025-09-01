// edge-functions/redirect-v2.js
// v2: uses FB/IG in-app + s1pcid health, no fbclid requirement.

const redirectMap = {
  // 👇 Paste the same id→URL pairs from your current redirect.js here
};

const FALLBACK_URL = Deno.env.get("FALLBACK_URL") || "https://google.com";

function isFbIgInApp(ua) {
  const u = (ua || "").toLowerCase();
  return (
    u.includes("fban") ||
    u.includes("fbav") ||
    u.includes("fb_iab") ||
    u.includes("instagram")
  );
}

function isValidS1pcid(v) {
  if (!v) return false;
  const trimmed = v.trim();

  // Fail if starts with "{"
  if (trimmed.startsWith("{")) return false;

  // Must be numeric, min 6 digits
  return /^[0-9]{6,}$/.test(trimmed);
}

export default async (request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const base = id ? redirectMap[id] : null;

  if (!base) {
    return new Response(null, {
      status: 302,
      headers: { Location: "https://google.com" },
    });
  }

  // build redirect URL, copy all params except id
  const dest = new URL(base);
  url.searchParams.forEach((value, key) => {
    if (key !== "id") dest.searchParams.set(key, value);
  });

  const ua = request.headers.get("user-agent") || "";
  const inApp = isFbIgInApp(ua);
  const s1pcid = url.searchParams.get("s1pcid");
  const s1ok = isValidS1pcid(s1pcid);

  if (inApp) dest.searchParams.set("iab", "1");

  if (inApp && !s1ok) {
    const fb = new URL(FALLBACK_URL);
    fb.searchParams.set("reason", "iab_bad_s1pcid");
    if (id) fb.searchParams.set("id", id);
    return new Response(null, { status: 302, headers: { Location: fb.href } });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: dest.href },
  });
};
