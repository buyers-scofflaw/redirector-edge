// netlify/functions/log-click.js
// Diagnostic version: returns detailed messages in response to find the failure.

exports.handler = async (event) => {
  try {
    // 0) Quick GET probe
    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers: { "content-type": "text/plain" },
        body: "log-click OK (GET). Try POST with uid + event_time."
      };
    }

    // 1) Method check
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: { "content-type": "text/plain" }, body: "Method Not Allowed" };
    }

    // 2) Body parse
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return { statusCode: 400, headers: { "content-type": "text/plain" }, body: "JSON parse error: " + e.message };
    }

    if (!body || !body.uid || !body.event_time) {
      return { statusCode: 400, headers: { "content-type": "text/plain" }, body: "Bad Request: need uid and event_time" };
    }

    // 3) Import blobs
    let getStore;
    try {
      ({ getStore } = await import("netlify/blobs"));
    } catch (e) {
      return { statusCode: 500, headers: { "content-type": "text/plain" }, body: "blobs import error: " + e.message };
    }

    // 4) Open store
    let store;
    try {
      store = getStore("click-logs");
    } catch (e) {
      return { statusCode: 500, headers: { "content-type": "text/plain" }, body: "getStore error: " + e.message };
    }

    // 5) Compute key
    let key;
    try {
      const day = new Date(body.event_time * 1000).toISOString().slice(0, 10);
      key = `clicks/${day}.jsonl`;
    } catch (e) {
      return { statusCode: 400, headers: { "content-type": "text/plain" }, body: "event_time invalid: " + e.message };
    }

    // 6) Append
    try {
      await store.append(key, JSON.stringify(body) + "\n");
    } catch (e) {
      return { statusCode: 500, headers: { "content-type": "text/plain" }, body: "store.append error: " + e.message };
    }

    return { statusCode: 200, headers: { "content-type": "text/plain" }, body: "OK (appended to " + key + ")" };
  } catch (e) {
    // final catch-all with visible body
    return { statusCode: 500, headers: { "content-type": "text/plain" }, body: "Server Error (catch-all): " + (e && e.message ? e.message : String(e)) };
  }
};
