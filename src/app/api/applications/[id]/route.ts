import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { encryptOpt } from "@/lib/crypto";
import { applicationSchema } from "@/lib/validation";
import { ownVersion } from "@/lib/resume/access";

const own = async (userId: string, id: string) => {
  const a = await db.query.applications.findFirst({ where: and(eq(schema.applications.id, id), eq(schema.applications.userId, userId)) });
  if (!a) throw new HttpError(404, "Application not found");
  return a;
};

export const PATCH = handler<{ id: string }>(async ({ req, user, params }) => {
  const cur = await own(user.id, params.id);
  const a = await body(req, applicationSchema.partial());
  if (a.resumeVersionId) await ownVersion(user.id, a.resumeVersionId);
  const set: Partial<typeof schema.applications.$inferInsert> = {};
  if (a.company !== undefined) set.company = a.company;
  if (a.title !== undefined) set.title = a.title;
  if (a.url !== undefined) set.url = a.url || null;
  if (a.status !== undefined) { set.status = a.status; if (a.status === "APPLIED" && !cur.appliedAt) set.appliedAt = new Date(); }
  if (a.notes !== undefined) set.notesEnc = encryptOpt(a.notes);
  if (a.appliedAt !== undefined) set.appliedAt = a.appliedAt ? new Date(a.appliedAt) : null;
  if (a.reminderAt !== undefined) set.reminderAt = a.reminderAt ? new Date(a.reminderAt) : null;
  if (a.resumeVersionId !== undefined) set.resumeVersionId = a.resumeVersionId || null;
  await db.update(schema.applications).set(set).where(eq(schema.applications.id, cur.id));
  return { ok: true };
});

export const DELETE = handler<{ id: string }>(async ({ user, params }) => {
  const cur = await own(user.id, params.id);
  await db.delete(schema.applications).where(eq(schema.applications.id, cur.id));
  return { ok: true };
});
