import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get("limit") || "20", 10)));

    const store = getStore("click-logs");
    const key = `clicks/${date}.jsonl`;
    const text = await store.get(key, { type: "text" });

    if (!text) {
      return Response.json({ date, count: 0, returned: 0, rows: [] });
    }

    const lines = text.split("\n").filter(Boolean);
    const tail = lines.slice(-limit).map((l) => {
      try { return JSON.parse(l); } catch { return { raw: l }; }
    });

    return Response.json({ date, count: lines.length, returned: tail.length, rows: tail });
  } catch (e) {
    console.error("peek error:", e && e.message ? e.message : e);
    return Response.json({ error: e.message || String(e) }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/log-click-peek",
};
