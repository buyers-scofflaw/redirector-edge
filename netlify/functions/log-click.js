import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    const body = await req.json();
    if (!body || !body.uid || !body.event_time) {
      return new Response("Bad Request", { status: 400 });
    }

    const store = getStore({ name: "click-logs", consistency: "strong" });
    const day = new Date(body.event_time * 1000).toISOString().slice(0, 10);
    const key = `clicks/${day}.jsonl`;

    // Read existing data, append new line, write back
    const existing = await store.get(key, { type: "text" });
    const line = JSON.stringify(body) + "\n";
    await store.set(key, (existing || "") + line);

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("log-click error:", e && e.message ? e.message : e);
    return new Response("Server Error", { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/log-click",
  method: "POST",
};
