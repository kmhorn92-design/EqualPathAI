import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { body, handler } from "@/lib/api";
import { decryptOpt, encryptOpt } from "@/lib/crypto";
import { applicationSchema } from "@/lib/validation";
import { track } from "@/lib/usage";

export const GET = handler(async ({ user }) => {
  const rows = await db.select().from(schema.applications).where(eq(schema.applications.userId, user.id)).orderBy(desc(schema.applications.updatedAt));
  return { items: rows.map(({ notesEnc, ...a }) => ({ ...a, notes: decryptOpt(notesEnc) })) };
});

export const POST = handler(async ({ req, user }) => {
  const a = await body(req, applicationSchema);
  const [row] = await db.insert(schema.applications).values({
    userId: user.id, jobId: a.jobId || null, company: a.company, title: a.title, url: a.url || null, status: a.status, notesEnc: encryptOpt(a.notes),
    appliedAt: a.appliedAt ? new Date(a.appliedAt) : a.status === "APPLIED" ? new Date() : null, reminderAt: a.reminderAt ? new Date(a.reminderAt) : null, resumeVersionId: a.resumeVersionId || null,
  }).returning({ id: schema.applications.id });
  await track("application_created");
  return { id: row.id };
});
