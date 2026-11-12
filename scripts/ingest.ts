/** Daily ingestion entrypoint. Schedule with cron / Vercel Cron (/api/cron/ingest) / GitHub Actions. */
import "./env";
import { runAll } from "../src/lib/jobs/ingest";
import { pool } from "../src/db";

runAll("cli").then((r) => {
  console.table(r.results.map(({ sourceId, status, fetched, inserted, updated, duplicates, rejected, markedStale }) => ({ sourceId, status, fetched, inserted, updated, duplicates, rejected, markedStale })));
  console.log("sweep:", r.sweep, "live counts:", r.counts);
}).catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
