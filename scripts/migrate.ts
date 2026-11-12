import "./env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** Uses DIRECT_URL (non-pooled) when set — migrations shouldn't run through a transaction pooler. */
async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const ssl = /sslmode=require/.test(url) || process.env.DB_SSL === "true" ? { rejectUnauthorized: process.env.DB_SSL_INSECURE !== "true" } : undefined;
  const pool = new Pool({ connectionString: url, max: 1, ssl });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("✓ migrations applied");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
