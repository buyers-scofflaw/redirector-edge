// netlify/functions/log-click-peek.js
// GET /.netlify/functions/log-click-peek?date=YYYY-MM-DD&limit=20
// Returns the last N click rows from that day's log in Netlify Blobs.

import { getStore } from '@netlify/blobs';

export default async (req) => {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0,10); // default = today
    const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get("limit") || "20", 10)));

    const store = getStore("click-logs");
    const key = `clicks/${date}.jsonl`;

    const blob = await store.get(key, { type: "stream" });
    if (!blob) {
      return new Response(JSON.stringify({ date, count: 0, rows: [] }, null, 2), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    const reader = blob.getReader();
    let chunks = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
    }
    const all = chunks.join("");
    const lines = all.split("\n").filter(Boolean);
    const tail = lines.slice(-limit).map(l => { try { return JSON.parse(l); } catch { return { raw:l }; } });

    return new Response(JSON.stringify({
      date,
      count: lines.length,
      returned: tail.length,
      rows: tail
    }, null, 2), { status: 200, headers: { "content-type": "application/json" }});
  } catch (e) {
    console.error("peek error:", e?.message || e);
    return new Response("Server Error", { status: 500 });
  }
};
