exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 200, headers: { "content-type": "text/plain" }, body: "OK" };
    }

    const body = JSON.parse(event.body || "{}");
    if (!body || !body.uid || !body.event_time) {
      return { statusCode: 400, headers: { "content-type": "text/plain" }, body: "Bad Request" };
    }

    // ESM package inside CJS: dynamic import
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("click-logs");

    const day = new Date(body.event_time * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
    await store.append(`clicks/${day}.jsonl`, JSON.stringify(body) + "\n");

    return { statusCode: 200, headers: { "content-type": "text/plain" }, body: "OK" };
  } catch (e) {
    console.error("log-click error:", e && e.message ? e.message : e);
    return { statusCode: 500, headers: { "content-type": "text/plain" }, body: "Server Error" };
  }
};
