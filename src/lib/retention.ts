import { eq, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { deleteObject } from "./storage";

/** Deletes resumes older than each user's chosen retention window, plus expired sessions. */
export async function enforceRetention() {
  const rows = await db.select({ id: schema.resumes.id, storageKey: schema.resumes.storageKey })
    .from(schema.resumes).innerJoin(schema.consents, eq(schema.consents.userId, schema.resumes.userId))
    .where(lt(schema.resumes.updatedAt, sql`now() - (${schema.consents.retentionDays} || ' days')::interval`));
  for (const r of rows) {
    if (r.storageKey) await deleteObject(r.storageKey).catch(() => {});
    await db.delete(schema.resumes).where(eq(schema.resumes.id, r.id));
  }
  const s = await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date())).returning({ id: schema.sessions.id });
  await db.insert(schema.auditLogs).values({ actor: "system", action: "retention.enforce", detail: { resumesDeleted: rows.length, sessionsDeleted: s.length } });
  return { resumesDeleted: rows.length, sessionsDeleted: s.length };
}

