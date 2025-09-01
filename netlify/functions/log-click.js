// netlify/functions/log-click.js
// Collects click data posted from the Edge redirect.
// Appends each event as a JSON line to a daily log file in Netlify Blobs.

import { getStore } from '@netlify/blobs';

export default async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    // Parse the incoming JSON
    const body = await req.json().catch(() => ({}));

    // Require at least a uid + event_time to be useful
    if (!body || !body.uid || !body.event_time) {
      return new Response("Bad Request", { status: 400 });
    }

    // Create (or open) the "click-logs" blob store
    const store = getStore("click-logs");

    // Use event_time (unix seconds) to pick the log file by day
    const day = new Date(body.event_time * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `clicks/${day}.jsonl`;

    // Append the click as one JSON line
    await store.append(key, JSON.stringify(body) + "\n");

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("log-click error:", e?.message || e);
    return new Response("Server Error", { status: 500 });
  }
};
