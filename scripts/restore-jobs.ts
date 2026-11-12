import "./env";
/** Re-checks job freshness without contacting any job source (safe to run any time). */
(async () => {
  const { sweepFreshness, liveCounts } = await import("../src/lib/jobs/ingest");
  const { pool } = await import("../src/db");
  console.log("sweep:", await sweepFreshness(), "live counts:", await liveCounts());
  await pool.end();
})();
