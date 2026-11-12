import { defineConfig } from "drizzle-kit";

try { process.loadEnvFile(".env"); } catch { /* variables may be set directly */ }
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL! },
});
