/**
 * S1 RECEIVERS: PENDING-ROW REPLAY
 *
 * Netlify scheduled function, every 10 minutes. Re-inserts rows that the
 * receivers could not get into BigQuery (see _shared/durable-bq.mts):
 *   - revenue postbacks whose write-ahead entry was never cleared
 *     (insert failed, or the function died before confirming)
 *   - PageView/Search/Lead queue rows parked after retries failed
 *
 * Uses a fresh (cached) token and the rows' original insertIds. Rows keep
 * their original timestamps (received_at etc.); downstream senders dedupe on
 * event_id, so a row inserted twice is harmless.
 *
 * Cost when nothing is pending: one Blobs list call, no BigQuery.
 * When it replays anything it appends a summary row to
 * my_dataset.bq_pending_replay_log so failures are visible in BigQuery.
 *
 * Entries BigQuery rejects outright (row/schema errors) move to the
 * "failed/" prefix instead of retrying forever; they are logged with the row.
 */

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import {
  PENDING_STORE, SCOPE_BQ, insertWithRetry, parseSaKey,
  type BqRow, type PendingEntry,
} from "./_shared/durable-bq.mts";

const MIN_AGE_MS = 2 * 60 * 1000;   // leave in-flight write-ahead entries alone
const MAX_ENTRIES = 2000;           // per run; the rest waits 10 min
const CHUNK_ROWS = 500;             // rows per insertAll
const TIME_BUDGET_MS = 20_000;      // scheduled functions stop at 30 s

function keyTime(key: string): number {
  const m = key.match(/\/(\d{13})-/);
  return m ? parseInt(m[1], 10) : 0;
}

export default async () => {
  const start = Date.now();
  const store = getStore({ name: PENDING_STORE, consistency: "strong" });

  const { blobs } = await store.list();
  const due = blobs
    .map((b) => b.key)
    .filter((k) => !k.startsWith("failed/") && start - keyTime(k) >= MIN_AGE_MS)
    .sort((a, b) => keyTime(a) - keyTime(b))
    .slice(0, MAX_ENTRIES);

  if (due.length === 0) {
    return new Response(JSON.stringify({ pending: blobs.length, replayed: 0 }), { status: 200 });
  }

  let sa;
  try {
    sa = parseSaKey(Netlify.env.get("GCP_SERVICE_ACCOUNT_KEY"));
  } catch (e: any) {
    console.error("s1-bq-pending-replay:", e?.message);
    return new Response("missing env", { status: 500 });
  }

  // Load entries and group by destination table.
  const groups = new Map<string, { key: string; entry: PendingEntry }[]>();
  for (const key of due) {
    const entry = (await store.get(key, { type: "json" })) as PendingEntry | null;
    if (!entry?.rows?.length) { await store.delete(key); continue; }
    const g = `${entry.dataset}.${entry.table}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push({ key, entry });
  }

  const audit: Record<string, unknown>[] = [];
  let replayed = 0, stillPending = 0, movedToFailed = 0;

  for (const [dest, items] of groups) {
    const [dataset, table] = dest.split(".");
    let okRows = 0, failedEntries = 0;
    let oldest = items[0]?.entry.first_failed_at ?? null;

    for (let i = 0; i < items.length; ) {
      if (Date.now() - start > TIME_BUDGET_MS) { stillPending += items.length - i; break; }
      // Build a chunk of up to CHUNK_ROWS rows.
      const chunk: typeof items = [];
      let n = 0;
      while (i < items.length && n + items[i].entry.rows.length <= CHUNK_ROWS) {
        n += items[i].entry.rows.length; chunk.push(items[i]); i++;
      }
      if (chunk.length === 0) { chunk.push(items[i]); i++; }
      const rows: BqRow[] = chunk.flatMap((c) => c.entry.rows);

      try {
        await insertWithRetry(sa, SCOPE_BQ, dataset, table, rows, Date.now() + 8000);
        await Promise.all(chunk.map((c) => store.delete(c.key)));
        okRows += rows.length; replayed += rows.length;
      } catch (e: any) {
        const msg = String(e?.message ?? e).slice(0, 500);
        const rowRejected = msg.startsWith("insertErrors");
        for (const c of chunk) {
          failedEntries++;
          if (rowRejected && chunk.length > 1) {
            // Isolate the bad row(s): retry this entry alone next run.
            await store.setJSON(c.key, { ...c.entry, attempts: c.entry.attempts + 1, last_error: msg });
            stillPending++;
          } else if (rowRejected) {
            await store.setJSON(`failed/${c.key}`, { ...c.entry, attempts: c.entry.attempts + 1, last_error: msg });
            await store.delete(c.key);
            movedToFailed++;
            console.error("s1-bq-pending-replay: row rejected by BigQuery, moved to failed/:", JSON.stringify(c.entry));
          } else {
            await store.setJSON(c.key, { ...c.entry, attempts: c.entry.attempts + 1, last_error: msg });
            stillPending++;
          }
        }
        console.error(`s1-bq-pending-replay: ${dest} chunk failed: ${msg}`);
      }
    }

    audit.push({
      run_at: new Date().toISOString(),
      table_name: dest,
      replayed_rows: okRows,
      failed_entries: failedEntries,
      oldest_first_failed_at: oldest,
    });
  }

  // Best effort: visibility in BigQuery only when something happened.
  try {
    await insertWithRetry(sa, SCOPE_BQ, "my_dataset", "bq_pending_replay_log",
      audit.map((a) => ({ json: a })), Date.now() + 5000);
  } catch (e: any) {
    console.warn("s1-bq-pending-replay: audit insert failed:", e?.message);
  }

  const summary = { due: due.length, replayed, still_pending: stillPending, moved_to_failed: movedToFailed,
    elapsed_s: ((Date.now() - start) / 1000).toFixed(1) };
  console.log("s1-bq-pending-replay:", JSON.stringify(summary));
  return new Response(JSON.stringify(summary), { status: 200, headers: { "Content-Type": "application/json" } });
};

export const config: Config = {
  schedule: "*/10 * * * *",
};
