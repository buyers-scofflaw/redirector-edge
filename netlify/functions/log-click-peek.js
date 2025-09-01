// netlify/functions/log-click-peek.js
// GET /.netlify/functions/log-click-peek?date=YYYY-MM-DD&limit=20
// Returns the last N rows from that day's JSONL log in Netlify Blobs.

exports.handler = async (event) => {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("click-logs");

    const qs = event.queryStringParameters || {};
    const date  = qs.date || new Date().toISOString().slice(0, 10);
    const limit = Math.max(1, Math.min(200, parseInt(qs.limit || "20", 10)));

    const key = `clicks/${date}.jsonl`;
    const text = await store.get(key, { type: "text" });

    if (!text) return json200({ date, count: 0, returned: 0, rows: [] });

    const lines = text.split("\n").filter(Boolean);
    const tail  = lines.slice(-limit).map(l => { try { return JSON.parse(l); } catch { return { raw: l }; } });

    return json200({ date, count: lines.length, returned: tail.length, rows: tail });
  } catch (e) {
    console.error("peek error:", e && e.message ? e.message : e);
    return { statusCode: 500, headers: { "content-type": "text/plain" }, body: "Server Error" };
  }
};

function json200(obj) {
  return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify(obj, null, 2) };
}
