import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";

/** Aggregated counter only — no user identifiers are stored. */
export async function track(event: string) {
  try {
    const day = new Date().toISOString().slice(0, 10);
    await db.insert(schema.usageDaily).values({ day, event, count: 1 })
      .onConflictDoUpdate({ target: [schema.usageDaily.day, schema.usageDaily.event], set: { count: sql`${schema.usageDaily.count} + 1` } });
  } catch { /* analytics must never break a request */ }
}

export async function audit(actor: string, action: string, target?: string, detail: Record<string, unknown> = {}) {
  await db.insert(schema.auditLogs).values({ actor, action, target, detail });
}
