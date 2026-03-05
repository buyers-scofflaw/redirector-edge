export default async (request, context) => {
  // 0) Let Netlify Functions handle their own paths (don't intercept /.netlify/functions/*)
  const reqUrl0 = new URL(request.url);
  if (reqUrl0.pathname.startsWith("/.netlify/functions/")) {
    return context.next();
  }

  // 0a) Bypass redirects for static assets (images, CSS, etc.)
  if (reqUrl0.pathname.startsWith("/assets/")) {
    return context.next();
  }

  // ===== V2 redirect with logging + click capture =====
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  // 1) Redirect map (injected by your Sheet push)
  const redirectMap = {
  "100": {
    "url": "https://google.com",
    "title": "\"Exploring Google's Evolution and Impact on the Digital World\"",
    "description": "Google is a leading search engine that provides users with quick access to information, images, and news from across the web. Explore a vast array of content effortlessly.",
    "locale": "en_US"
  },
  "107": {
    "url": "https://etoptip.com/health/are-dental-implant-trials-a-viable-option-en-us/?segment=rsoc.sc.etoptip.001&headline=Dental+Implants+Clinical+Trial&forceKeyA=$1500+for+dental+implant+participation+search+now+near+me+{Month}+2026&forceKeyB=$1500+for+dental+implant+participation+near+me+{Month}+2026&forceKeyC=get+$1950+for+dental+implant+participation+near+me&forceKeyD=$1500+for+dental+implant+participation+search+now+near+me&forceKeyE=paid+clinical+trials+for+dental+implants+near+me&forceKeyF=$1500+for+dental+implant+participation+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&s1pplacement=fbk",
    "title": "Evaluating the Viability of Dental Implant Trials",
    "description": "Explore the viability of dental implant trials as a treatment option, including potential participation benefits and financial incentives for participants.",
    "locale": "en_US"
  },
  "108": {
    "url": "https://etoptip.com/automotive/is-the-2026-rogue-the-right-suv-for-you-en-us-3/?segment=rsoc.sc.etoptip.001&headline=Crossover+SUVs+Nearby&forceKeyA=$100/month+-+rogue+2025+crossover+suvs+around+me&forceKeyB=$100/month+-+rogue+2026+crossover+suvs+nearby&forceKeyC=$100/month+-+rogue+2025+crossover+suvs+around+me+{Month}+2026&forceKeyD=for+seniors+2025+rogue+crossover+suvs+nearby+rogue+no+cost&forceKeyE=$100/month+rogue+2025+crossover+suvs+nearby&forceKeyF=car+payments+100+dollars+a+month&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement=fbk",
    "title": "Is the 2026 Rogue the Ideal SUV for Your Needs?",
    "description": "Explore the features and specifications of the 2026 Nissan Rogue to determine if it's the ideal SUV for your needs and lifestyle.",
    "locale": "en_US"
  },
  "109": {
    "url": "https://etoptip.com/technology/programs-that-help-seniors-get-affordable-internet-en-us-3/?segment=rsoc.sc.etoptip.001&headline=Best+Internet+Providers&forceKeyA=internet+for+seniors+in+my+area&forceKeyB=no+cost+internet+for+seniors&forceKeyC=get+$0+internet+providers+in+my+zip+code+availability&forceKeyD=no+cost+internet+plans+by+zip+code+-+for+seniors&forceKeyE=get+senior+internet+plans+[at+no+cost]+(at+my+address)&forceKeyF=no+cost+internet+plans+by+zip+code+(for+seniors)&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement=fbk",
    "title": "Affordable Internet Options for Seniors: Key Programs and Providers",
    "description": "Discover programs that provide affordable internet options for seniors, including no-cost plans based on your location and specific needs.",
    "locale": "en_US"
  },
  "110": {
    "url": "https://etoptip.com/finance/how-can-you-finance-your-next-cell-phone-en-us/?segment=rsoc.sc.etoptip.001&headline=Get+New+Phone&forceKeyA=get+new+phone+for+seniors+[at+no+cost]&forceKeyB=new+phone+for+seniors+[at+no+cost]&forceKeyC=100%+free+phones+for+seniors&forceKeyD=get+a+new+phone&forceKeyE=i+need+a+new+phone&forceKeyF=get+new+phones+for+seniors+[at+no+cost]&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement=fbk",
    "title": "Financing Options for Your Next Cell Phone Purchase",
    "description": "Discover various financing options for your next cell phone, including programs tailored for seniors to acquire new devices at no cost.",
    "locale": "en_US"
  },
  "111": {
    "url": "https://etoptip.com/real-estate/affordable-housing-for-low-income-seniors-en-us-2/?segment=rsoc.sc.etoptip.001&headline=learn+more+about+55+and+older+apartments&forceKeyA=senior+apartments+for+$300+a+month+near+me&forceKeyB=apartments+for+senior+citizens+near+me&forceKeyC=apartments+55+and+older+near+me&forceKeyD=62+and+over+apartments+near+me&forceKeyE=seniors+residences+near+me&forceKeyF=55+and+older+communities+in+{State}&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement=fbk",
    "title": "Affordable Housing Options for Low-Income Seniors",
    "description": "Discover affordable housing options tailored for low-income seniors, including 55 and older apartment communities designed for comfort and accessibility.",
    "locale": "en_US"
  },
  "112": {
    "url": "https://etoptip.com/health/latest-advances-in-weight-loss-clinical-trials-en-us-3/?segment=rsoc.sc.etoptip.001&headline=Weight+Loss&forceKeyA=$1500+for+fat+reduction+treatment+participation+near+me&forceKeyB=$6000+for+belly+fat+reduction+treatment+participation+near+my+zipcode+coolsculpting&forceKeyC=locate+$1500+for+belly+fat+reduction+treatment+participation+appointment+near+me&forceKeyD=get+$1500+for+belly+fat+reduction+treatment+participation+appointment&forceKeyE=$6000+for+belly+fat+reduction+treatment+participation+in+near+my+zipcode+coolsculpting&forceKeyF=$1500+for+belly+fat+reduction+treatments+participation+appointment&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement=fbk",
    "title": "\"Recent Breakthroughs in Weight Loss Clinical Trials\"",
    "description": "Explore the latest advancements in weight loss clinical trials, focusing on innovative treatments and their effectiveness in fat reduction.",
    "locale": "en_US"
  }
};

  // 2) OG metadata map (injected from your domain_settings tab)
  const ogMetaMap = {
  "https://health-helpers.com": {
    "site_name": "Health Helpers",
    "image": "https://health-helpers.com/assets/wellnessauthority-og.png",
    "image_alt": "Smiling healthcare professional providing guidance and support.",
    "type": "article"
  },
  "https://vitals-nest.com": {
    "site_name": "VitalsNest",
    "image": "https://vitals-nest.com/assets/vitalsnest-og.png",
    "image_alt": "Calm and modern design representing health and wellness balance.",
    "type": "article"
  },
  "https://wellness-authority.com": {
    "site_name": "Wellness Authority",
    "image": "https://wellness-authority.com/assets/healthhelpers-og.png",
    "image_alt": "Peaceful wellness setting with natural light and greenery.",
    "type": "article"
  },
  "https://wheel-home.com": {
    "site_name": "WheelHome",
    "image": "https://wheel-home.com/assets/wheelhome-og.png",
    "image_alt": "A modern car exterior with a connected lifestyle vibe.",
    "type": "article"
  },
  "https://consciousconsumerinfo.com": {
    "site_name": "ConsciousConsumer",
    "image": "https://consciousconsumerinfo.com/assets/consciousconsumer-og.png",
    "image_alt": "Eco-friendly products and sustainable lifestyle imagery.",
    "type": "article"
  },
  "https://insiderconsumers.com": {
    "site_name": "InsiderConsumer",
    "image": "https://insiderconsumers.com/assets/insiderconsumer-og.png",
    "image_alt": "Consumer trends displayed on digital screens and analytics charts.",
    "type": "article"
  },
  "https://trending-genius.com": {
    "site_name": "TrendingGenius",
    "image": "https://trending-genius.com/assets/trendinggenius-og.png",
    "image_alt": "Abstract brain and idea visuals symbolizing innovation.",
    "type": "article"
  },
  "https://trendy-review.com": {
    "site_name": "TrendyReview",
    "image": "https://trendy-review.com/assets/trendyreview-og.png",
    "image_alt": "Hands typing product reviews on a laptop with a coffee cup.",
    "type": "article"
  },
  "https://trending-briefs.com": {
    "site_name": "TrendingBriefs",
    "image": "https://trending-briefs.com/assets/trendingbriefs-og.png",
    "image_alt": "Modern digital feed showing trending news headlines.",
    "type": "article"
  },
  "https://techfuelus.com": {
    "site_name": "TechFuel",
    "image": "https://techfuelus.com/assets/techfuel-og.png",
    "image_alt": "Futuristic tech background with circuits and glowing lights.",
    "type": "article"
  },
  "https://trendyfuel.com": {
    "site_name": "TrendyFuel",
    "image": "https://trendyfuel.com/assets/trendyfuel-og.png",
    "image_alt": "Dynamic energy burst graphic representing innovation and growth.",
    "type": "article"
  },
  "https://insight-bulletin.com": {
    "site_name": "Insight Bulletin",
    "image": "https://insight-bulletin.com/assets/insightbulletin-og.png",
    "image_alt": "Clean editorial layout showing charts and business articles.",
    "type": "article"
  },
  "https://top-mind-grid.com": {
    "site_name": "MindGrid",
    "image": "https://top-mind-grid.com/assets/mindgrid-og.png",
    "image_alt": "Stylized digital grid symbolizing modern ideas and trends.",
    "type": "article"
  },
  "https://the-clarity-central.com": {
    "site_name": "Clarity Central",
    "image": "https://the-clarity-central.com/assets/claritycentral-og.png",
    "image_alt": "Minimalist design with clear glass elements and modern type.",
    "type": "article"
  },
  "https://the-buzz-lens.com": {
    "site_name": "Buzz Lens",
    "image": "https://the-buzz-lens.com/assets/buzzlens-og.png",
    "image_alt": "Close-up camera lens reflecting trending social content.",
    "type": "article"
  },
  "https://savvy-scope.com": {
    "site_name": "SavvyScope",
    "image": "https://savvy-scope.com/assets/savvyscope-og.png",
    "image_alt": "A magnifying glass highlighting insights and discoveries.",
    "type": "article"
  },
  "https://last-call-tech.com": {
    "site_name": "Last Call Tech",
    "image": "https://last-call-tech.com/assets/lastcalltech-og.png",
    "image_alt": "Dark tech illustration symbolizing late-night automation, systems, and infrastructure.",
    "type": "article"
  },
  "https://everything-today.com": {
    "site_name": "Everything Today",
    "image": "https://everything-today.com/assets/everythingtoday-og.jpg",
    "image_alt": "Glowing systems illustrate automation, productivity, and interconnected technology working continuously.",
    "type": "article"
  }
};

  // 3) Detect if this is a crawler (Facebook, Twitter, Slack, etc.)
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const isCrawler =
    /(facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|embedly|whatsapp|telegram|preview)/i.test(ua);

  // 4) If it's a crawler, serve OG metadata directly (no redirect)
  if (isCrawler) {
    const host = reqUrl0.hostname.replace(/^www\./, "");
    const meta = ogMetaMap["https://" + host] || ogMetaMap[host];

    if (meta) {
      const row = redirectMap && id ? redirectMap[id] : null;

      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>${meta.site_name}</title>
            <meta property="og:url" content="${request.url}">
            <meta property="og:type" content="${meta.type}">
            <meta property="og:title" content="${(row && row.title) ? row.title : meta.site_name}">
            <meta property="og:description" content="${(row && row.description) ? row.description : meta.image_alt}">
            <meta property="og:image" content="${meta.image}">
            <meta property="og:image:alt" content="${meta.image_alt}">
            <meta property="og:site_name" content="${meta.site_name}">
            <meta property="og:locale" content="${(row && row.locale) ? row.locale : "en_US"}">
            <meta property="og:updated_time" content="${Math.floor(Date.now() / 1000)}">
          </head>
          <body>
            <p>Preview for ${meta.site_name}</p>
          </body>
        </html>`;

      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
  }

  // 5) Normal redirect configuration
  const FALLBACK_URL = "https://www.facebook.com";

  // Post to MULTIPLE collectors (existing Apps Script + Cloud Run)
  const COLLECTORS = [
    "https://click-collector-583868590168.us-central1.run.app/collect"
  ];

  // 6) Helpers
  function isFbIgInApp(uaStr) {
    const u = (uaStr || "").toLowerCase();
    return u.includes("fban") || u.includes("fbav") || u.includes("fb_iab") || u.includes("instagram");
  }

  function isValidS1pcid(v) {
    if (!v) return false;
    const t = String(v).trim();
    if (t.startsWith("{")) return false;
    return /^[0-9]{6,}$/.test(t);
  }

  function makeFbcFromFbclid(fbclid) {
    if (!fbclid) return null;
    const ts = Math.floor(Date.now() / 1000);
    return `fb.1.${ts}.${fbclid}`;
  }

  function makeFbp() {
    const ts = Math.floor(Date.now() / 1000);
    const rand = Math.random().toString(36).slice(2);
    return `fb.1.${ts}.${rand}`;
  }

  function uuidv4() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  }

  function appendCookie(h, name, value, maxAgeDays = 90) {
    if (!value) return;
    const maxAge = maxAgeDays * 24 * 3600;
    h.append("Set-Cookie", `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
  }

  function redirectResponse(locationUrl, extraHeaders) {
    const h = new Headers({ Location: locationUrl });
    if (extraHeaders) for (const [k, v] of extraHeaders.entries()) h.append(k, v);
    return new Response(null, { status: 302, headers: h });
  }

  // Fire-and-forget POSTs (we don?t wait for them)
  function postToCollectors(payload, context) {
    for (const endpoint of COLLECTORS) {
      const controller = new AbortController();
      const kill = setTimeout(() => controller.abort(), 1500);

      context.waitUntil(
        fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
          redirect: "manual",
          signal: controller.signal
        })
          .catch(() => {})
          .finally(() => clearTimeout(kill))
      );
    }
  }

  // ? NEW: derive event_source_url from destination domain (search.<root>.com)
  function deriveEventSourceUrl(destUrl) {
    try {
      const parts = new URL(destUrl).hostname.replace(/^www\./, "").split(".");
      if (!parts || parts.length < 2) return null;
      return "https://search." + parts[parts.length - 2] + ".com/";
    } catch {
      return null;
    }
  }

  // 7) Inputs
  const uaHead = request.headers.get("user-agent") || "";
  const base = id ? redirectMap[id] : null;

  const inApp = isFbIgInApp(uaHead);
  const rawS1 = url.searchParams.get("s1pcid") || "";
  const s1ok = isValidS1pcid(rawS1);

  // 8) Handle unknown IDs
  if (!base) {
    console.log("Redirect", { id, inApp, s1ok, reason: "unknown id", dest: "https://facebook.com" });
    return redirectResponse("https://facebook.com");
  }

  // 9) Build final destination (preserve most params)
  const DROP = new Set([
    "utm_medium", "utm_id", "utm_content", "utm_term", "utm_campaign", "iab", "id"
  ]);

  if (!base || !base.url) {
    console.log("Redirect", { id, reason: "missing base.url", dest: "https://facebook.com" });
    return redirectResponse("https://facebook.com");
  }

  let dest;
  try {
    dest = new URL(base.url);
  } catch (err) {
    console.error("Invalid redirect URL", base, err);
    return redirectResponse("https://facebook.com");
  }

  // copy through allowed params
  url.searchParams.forEach((value, key) => {
    if (!DROP.has(key)) dest.searchParams.set(key, value);
  });

  // 10) Capture event
  const now = Math.floor(Date.now() / 1000);
  const uid = uuidv4();

  dest.searchParams.set("s1padid", uid);
  if (!s1ok) dest.searchParams.delete("s1pcid");

  const rawCookie = request.headers.get("cookie") || "";
  const cookieMap = Object.fromEntries(
    rawCookie.split(/;\s*/).filter(Boolean).map(c => {
      const i = c.indexOf("=");
      return i === -1 ? [c, ""] : [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
    })
  );

  const fbclid = url.searchParams.get("fbclid") || null;
  const fbc = cookieMap._fbc || makeFbcFromFbclid(fbclid);
  const fbp = cookieMap._fbp || makeFbp();

  const ipHeader =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-nf-client-connection-ip") ||
    "";
  const client_ip = ipHeader.split(",")[0].trim();

  const isFallback = !inApp && !s1ok;
  const finalLocation = isFallback ? FALLBACK_URL : dest.href;

  // ? ONLY CHANGE vs source-of-truth: event_source_url value
  const event_source_url = deriveEventSourceUrl(finalLocation) || request.url;

  // 11) Log to collectors (payload preserved)
  try {
    postToCollectors({
      uid,
      fbclid,
      fbc,
      fbp,
      id,
      s1pcid: rawS1 || null,
      inApp,
      client_ip,
      event_time: now,
      event_source_url,
      ua: uaHead,
      dest: finalLocation
    }, context);
  } catch {}

  // 12) Set cookies + redirect
  const cookieHeaders = new Headers();
  appendCookie(cookieHeaders, "_fbc", fbc);
  appendCookie(cookieHeaders, "_fbp", fbp);
  appendCookie(cookieHeaders, "uid", uid);

  console.log("Redirect", { id, inApp, s1ok, dest: finalLocation });
  return redirectResponse(finalLocation, cookieHeaders);
};