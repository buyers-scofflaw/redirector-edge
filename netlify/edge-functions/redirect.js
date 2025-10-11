export default async (request, context) => {
  // 0) Let Netlify Functions handle their own paths (don't intercept /.netlify/functions/*)
  const reqUrl0 = new URL(request.url);
  if (reqUrl0.pathname.startsWith("/.netlify/functions/")) {
    return context.next();
  }

  // ===== V2 redirect with logging + click capture =====

  const url = new URL(request.url);

  // 1) Redirect map (injected by your Sheet push)
  const redirectMap = {
  "100": "https://google.com",
  "107": "https://read.mdrntoday.com/automotive/2025-nissan-rogue-pricing-what-to-expect-and-how-it-stacks-up-en-us-3/?segment=rsoc.sc.mdrntoday.001&headline=nissan+rogue+suv&forceKeyA=For+Seniors:+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyB=100+Accepted+|+0+Down+Options+-+Rogue+2024+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyC=Nearby+Rogue+-+Zero+Down+100+Accepted+Suvs&forceKeyD=100+Accepted+|+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost+Payment&forceKeyE=100+Accepted+-+0+Down+Options+-+Rogue+Crossover+Suvs+Nearby+-+Rogue&forceKeyF=100+Accepted+|+0+Down+Dealerships+-+Leftover+Crossover+Suvs+Nearby+no+Cost+(rogue)&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "203": "https://read.mdrntoday.com/careers/jobs-in-home-remodeling-opportunities-and-career-paths-es-us-2/?segment=rsoc.sc.mdrntoday.001&headline=Learn+about+home+remodeling+companies&forceKeyA=home+remodeling+contractors&forceKeyB=home+remodeling+companies+in+my+area&forceKeyC=painting+companies+in+my+area&forceKeyD=repair+contractors+in+{City}&forceKeyE=home+remodeling+companies+near+me&forceKeyF=&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "342": "https://read.mdrntoday.com/education/government-funded-phlebotomy-training-can-change-your-future-en-us-2/?segment=rsoc.sc.mdrntoday.001&headline=learn+about+phlebotomy&forceKeyA=Paid+Phlebotomy+Training&forceKeyB=Phlebotomy+Training+Programs&forceKeyC=Free+Phlebotomy+Training&forceKeyD=4+Week+Phlebotomy+Classes&forceKeyE=Free+Phlebotomy+Training+Online&forceKeyF=Red+Cross+Phlebotomy+Training&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "374": "https://read.mdrntoday.com/health/egg-donation-understanding-potential-benefits-and-compensation-en-us/?segment=rsoc.sc.mdrntoday.001&headline=Learn+How+Egg+Donation+Works&forceKeyA=donor+egg+for+ivf+in+{City}&forceKeyB=egg+donor+clinic+{State}&forceKeyC=paid+egg+donors+wanted+in+{City}&forceKeyD=best+egg+donor+banks+in+{City}&forceKeyE=get+paid+to+donate+eggs+near+me&forceKeyF=egg+donor+compensation+{State}+2025&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "406": "https://read.investingfuel.com/finance/securing-your-future-the-benefits-of-including-gold-ira-kits-in-your-retirement-strategy-en-us-2/?segment=rsoc.sd.investingfuel.001&headline=gold+ira&forceKeyA=Get+Free+Gold+IRA+Kit+With+$10k&forceKeyB=Gold+Ira+Kits+[$0+Cost]&forceKeyC=Gold+Ira+Kit+[$0+Cost]&forceKeyD=Free+Gold+IRA+Kit+U2013+[no+Cost]&forceKeyE=Free+Gold+Ira+Kits+U2013+[no+Cost]&forceKeyF=Get+a+Gold+Ira+Kit&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "470": "https://read.mdrntoday.com/health/understanding-why-home-caregivers-are-in-high-demand-en-us/?segment=rsoc.sc.mdrntoday.001&headline=Learn+about+caregiving&forceKeyA=Caregiver+Needed+Immediately&forceKeyB=Care+Homes+in+My+Area&forceKeyC=Private+Caregiver+Nearby&forceKeyD=Care+Homes+in+Sacramento&forceKeyE=Caregiver+Jobs+Near+Me+Full+Time&forceKeyF=Private+Sitters+for+Elderly+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "495": "https://read.investingfuel.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-8/?segment=rsoc.sd.investingfuel.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+sign+Up+Now&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+search+Now&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "517": "https://mdrnlocal.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-4/?segment=rsoc.sc.mdrnlocal.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "522": "https://mdrnlocal.com/health/how-to-join-paid-sleep-apnea-trials-en-us/?segment=rsoc.sc.mdrnlocal.001&headline=sleep+apnea&forceKeyA=join+sleep+apnea+studies+near+me+{State}&forceKeyB=see+paid+sleep+apnea+studies+in+{State}&forceKeyC={State}+paid+sleep+apnea+studies+near+me&forceKeyD=join+paid+sleep+apnea+studies+in+{City}&forceKeyE=join+paid+sleep+apnea+studies+near+me&forceKeyF=join+sleep+apnea+studies+near++{State}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "569": "https://read.investingfuel.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-15/?segment=rsoc.sd.investingfuel.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "575": "https://read.investingfuel.com/education/choosing-online-schools-that-provide-computers-en-us-5/?segment=rsoc.sd.investingfuel.001&headline=online+high+school+with+laptop&forceKeyA=free+online+high+school&forceKeyB=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyC=apply+for+online+highschool+that+gives+you+$+and+a+laptop+today+no+cost&forceKeyD=apply+for+online+school+high+school+that+gives+you+a+computer&forceKeyE=apply+for+online+school+high+school+that+give+you+a+computer+now&forceKeyF=free+online+high+school+{state}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "593": "https://mdrnlocal.com/health/understanding-why-home-caregivers-are-in-high-demand-en-us/?segment=rsoc.sc.mdrnlocal.001&headline=Learn+about+caregiving&forceKeyA=Caregiver+Needed+Immediately&forceKeyB=Care+Homes+in+My+Area&forceKeyC=Private+Caregiver+Nearby&forceKeyD=Care+Homes+in+{City}&forceKeyE=Caregiver+Jobs+Near+Me+Full+Time&forceKeyF=Private+Sitters+for+Elderly+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "604": "https://read.mdrntoday.com/general/understanding-delivery-driving-in-the-hvac-industry-en-us/?segment=rsoc.sc.mdrntoday.001&headline=learn+about+HVAC+delivery&forceKeyA=Air+Conditioning+Companies+in+{City}&forceKeyB=HVAC+Companies+Near+Me&forceKeyC=HVAC+Companies+in+{City}&forceKeyD=Local+HVAC+Companies&forceKeyE=Heating+and+Air+Conditioning+Companies&forceKeyF=HVAC+Services+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "630": "https://read.mdrntoday.com/general/understanding-delivery-driving-in-the-hvac-industry-en-us/?segment=rsoc.sc.mdrntoday.001&headline=learn+about+HVAC+delivery&forceKeyA=Air+Conditioning+Companies+in+{City}&forceKeyB=HVAC+Companies+Near+Me&forceKeyC=HVAC+Companies+in+{City}&forceKeyD=Local+HVAC+Companies&forceKeyE=Heating+and+Air+Conditioning+Companies&forceKeyF=HVAC+Services+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "632": "https://read.mdrntoday.com/health/understanding-why-home-caregivers-are-in-high-demand-en-us-3/?segment=rsoc.sc.mdrntoday.001&headline=Learn+about+caregiving&forceKeyA=Caregiver+Needed+Immediately&forceKeyB=Care+Homes+in+My+Area&forceKeyC=Private+Caregiver+Nearby&forceKeyD=Care+Homes+in+{City}&forceKeyE=Caregiver+Jobs+Near+Me+Full+Time&forceKeyF=Private+Sitters+for+Elderly+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "645": "https://read.investingfuel.com/health/understanding-why-home-caregivers-are-in-high-demand-en-us-4/?segment=rsoc.sd.investingfuel.001&headline=Learn+about+caregiving&forceKeyA=Caregiver+Needed+Immediately&forceKeyB=Care+Homes+in+My+Area&forceKeyC=Private+Caregiver+Nearby&forceKeyD=Care+Homes+in+{City}&forceKeyE=Caregiver+Jobs+Near+Me+Full+Time&forceKeyF=Private+Sitters+for+Elderly+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook"
};

  // 2) Config
  const FALLBACK_URL = "https://www.msn.com";

  // Post to MULTIPLE collectors (existing Google Apps Script + NEW Cloud Run)
  const COLLECTORS = [
    // Existing Sheets Apps Script collector
    //"https://script.google.com/macros/s/AKfycbwSQ-lPe5_A1c8mZ4DinBmK33xsvOdvdvLFD3fWdFI9oVDQ98IdKEv04ALvutxdK7iu/exec",
    // NEW Cloud Run -> BigQuery collector
    "https://click-collector-583868590168.us-central1.run.app/collect"
  ];

  // 3) Helpers
  function isFbIgInApp(ua) {
    const u = (ua || "").toLowerCase();
    return u.includes("fban") || u.includes("fbav") || u.includes("fb_iab") || u.includes("instagram");
  }
  function isValidS1pcid(v) {
    if (!v) return false;
    const t = v.trim();
    if (t.startsWith("{")) return false;
    return /^[0-9]{6,}$/.test(t);
  }
  function makeFbcFromFbclid(fbclid) {
    if (!fbclid) return null;
    const ts = Math.floor(Date.now()/1000);
    return `fb.1.${ts}.${fbclid}`;
  }
  function makeFbp() {
    const ts = Math.floor(Date.now()/1000);
    const rand = Math.random().toString(36).slice(2);
    return `fb.1.${ts}.${rand}`;
  }
  function uuidv4() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = (Math.random()*16)|0, v = c==="x" ? r : (r&0x3)|0x8;
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
    if (extraHeaders) for (const [k,v] of extraHeaders.entries()) h.append(k, v);
    return new Response(null, { status: 302, headers: h });
  }

  // Fire-and-forget POSTs so the redirect is never blocked
  function postToCollectors(payload, context) {
    for (const endpoint of COLLECTORS) {
      const controller = new AbortController();
      const kill = setTimeout(() => controller.abort(), 1500); // 1.5s guard

      // Don't await ? run in the background
      context.waitUntil(
        fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
          redirect: "manual",
          signal: controller.signal
        })
        .catch(() => {})           // swallow errors (we never block the user)
        .finally(() => clearTimeout(kill))
      );
    }
  }

  // 4) UA, inputs
  const uaHead = request.headers.get("user-agent") || "";

  // 5) Resolve base destination
  const id   = url.searchParams.get("id");
  const base = id ? redirectMap[id] : null;

  const ua    = uaHead;
  const inApp = isFbIgInApp(ua);

  const rawS1  = url.searchParams.get("s1pcid") || "";
  const s1pcid = rawS1.length > 64 ? rawS1.slice(0,64) + "?" : rawS1;
  const s1ok   = isValidS1pcid(rawS1);

  if (!base) {
    console.log("Redirect", { id, inApp, s1pcid, s1ok, reason: "unknown id", dest: "https://google.com" });
    return redirectResponse("https://google.com");
  }

  // 6) Build destination: drop ONLY these params, preserve everything else (except id)
  const DROP = new Set(["utm_medium","utm_id","utm_content","utm_term","utm_campaign","iab","id"]);
  const dest = new URL(base);
  url.searchParams.forEach((value, key) => {
    if (!DROP.has(key)) dest.searchParams.set(key, value);
  });

  // 7) Click capture
  const now = Math.floor(Date.now()/1000);
  const uid = uuidv4();

  // ALWAYS add s1padid={uid}
  dest.searchParams.set("s1padid", uid);

  // If s1pcid invalid, strip it from outgoing URL
  if (!s1ok) dest.searchParams.delete("s1pcid");

  // Cookies in
  const rawCookie = request.headers.get("cookie") || "";
  const cookieMap = Object.fromEntries(
    rawCookie.split(/;\s*/).filter(Boolean).map(c => {
      const i = c.indexOf("="); return i === -1 ? [c, ""] : [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
    })
  );
  const fbclid = url.searchParams.get("fbclid") || null;
  let fbc = cookieMap._fbc || makeFbcFromFbclid(fbclid);
  let fbp = cookieMap._fbp || makeFbp();

  // Best-effort client IP
  const ipHeader =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-nf-client-connection-ip") || "";
  const client_ip = ipHeader.split(",")[0].trim();

  // 8) Decide final location AFTER all mutations (so logged dest is exact)
  const isFallback    = (!inApp && !s1ok);
  const finalLocation = isFallback ? FALLBACK_URL : dest.href;

  // 9) Fire-and-forget POSTs to BOTH collectors (Sheets & Cloud Run)
  try {
    postToCollectors({
      uid, fbclid, fbc, fbp, id,
      s1pcid: rawS1 || null,
      inApp,
      client_ip,
      event_time: now,
      event_source_url: request.url,
      ua,
      dest: finalLocation
    }, context);
  } catch {}

  // 10) Set cookies and log
  const cookieHeaders = new Headers();
  appendCookie(cookieHeaders, "_fbc", fbc);
  appendCookie(cookieHeaders, "_fbp", fbp);
  appendCookie(cookieHeaders, "uid", uid);

  if (isFallback) {
    console.log("Redirect", { id, inApp, s1pcid, s1ok, reason: "fallback msn (non-in-app invalid s1pcid)", dest: finalLocation });
  } else {
    console.log("Redirect", { id, inApp, s1pcid, s1ok, reason: "pass", dest: finalLocation });
  }

  // 11) Redirect
  return redirectResponse(finalLocation, cookieHeaders);
};