// netlify/functions/log-click.js (sanity check)
export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, method: event.httpMethod, body }, null, 2)
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "content-type": "text/plain" },
      body: "JSON parse error: " + (e?.message || e)
    };
  }
};

// netlify/functions/log-click.js
// Collects click data posted from the Edge redirect.
// Appends each event as a JSON line to a daily log file in Netlify Blobs.

export const handler = async (event) => {
  try {
    // Only accept POST requests
    if (event.httpMethod !== "POST") {
      return { statusCode: 200, headers: { "content-type": "text/plain" }, body: "OK" };
    }

    // Parse incoming JSON
    const body = JSON.parse(event.body || "{}");

    // Require at least uid + event_time (unix seconds)
    if (!body || !body.uid || !body.event_time) {
      return { statusCode: 400, headers: { "content-type": "text/plain" }, body: "Bad Request" };
    }

    // Import Blobs in Functions (v1 handler): use dynamic import
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("click-logs");

    // Use event_time to choose daily file
    const day = new Date(body.event_time * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `clicks/${day}.jsonl`;

    // Append as one JSON line
    await store.append(key, JSON.stringify(body) + "\n");

    return { statusCode: 200, headers: { "content-type": "text/plain" }, body: "OK" };
  } catch (e) {
    console.error("log-click error:", e?.message || e);
    return { statusCode: 500, headers: { "content-type": "text/plain" }, body: "Server Error" };
  }
};
