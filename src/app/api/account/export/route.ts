import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler } from "@/lib/api";
import { decryptJson, decryptOpt } from "@/lib/crypto";

/** Full personal-data export (decrypted) as JSON. */
export const GET = handler(async ({ user }) => {
  const [u, profile, consent, resumes, apps, saved, attempts, lessons, threads] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { passwordHash: false } }),
    db.query.profiles.findFirst({ where: eq(schema.profiles.userId, user.id) }),
    db.query.consents.findFirst({ where: eq(schema.consents.userId, user.id) }),
    db.select().from(schema.resumes).where(eq(schema.resumes.userId, user.id)),
    db.select().from(schema.applications).where(eq(schema.applications.userId, user.id)),
    db.select().from(schema.savedJobs).where(eq(schema.savedJobs.userId, user.id)),
    db.select().from(schema.assessmentAttempts).where(eq(schema.assessmentAttempts.userId, user.id)),
    db.select().from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, user.id)),
    db.select().from(schema.chatThreads).where(eq(schema.chatThreads.userId, user.id)),
  ]);
  const sessions = await db.select().from(schema.bookings).where(eq(schema.bookings.userId, user.id));
  const versions = resumes.length ? await db.select().from(schema.resumeVersions).where(inArray(schema.resumeVersions.resumeId, resumes.map((r) => r.id))) : [];
  const messages = threads.length ? await db.select().from(schema.chatMessages).where(inArray(schema.chatMessages.threadId, threads.map((t) => t.id))) : [];
  const out = {
    exportedAt: new Date().toISOString(), account: u, profile, consent,
    resumes: resumes.map((r) => ({ id: r.id, title: r.title, originalName: r.originalName, createdAt: r.createdAt, data: decryptJson(r.parsedEnc),
      versions: versions.filter((v) => v.resumeId === r.id).map((v) => ({ id: v.id, label: v.label, templateId: v.templateId, jobTitle: v.jobTitle, createdAt: v.createdAt, content: decryptJson(v.contentEnc), jobDescription: decryptOpt(v.jobDescEnc), analysis: v.analysisEnc ? decryptJson(v.analysisEnc) : null })) })),
    coachingSessions: sessions.map(({ goalEnc, accessibilityEnc, coachNoteEnc, ...b }) => ({ ...b, goal: decryptOpt(goalEnc), accessibility: decryptOpt(accessibilityEnc), coachNote: decryptOpt(coachNoteEnc) })),
    applications: apps.map(({ notesEnc, ...a }) => ({ ...a, notes: decryptOpt(notesEnc) })), savedJobs: saved, assessmentAttempts: attempts, lessonProgress: lessons,
    coachThreads: threads.map((t) => ({ ...t, messages: messages.filter((m) => m.threadId === t.id).map((m) => ({ role: m.role, content: decryptOpt(m.contentEnc), createdAt: m.createdAt })) })),
  };
  return new Response(JSON.stringify(out, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="equalpath-export-${new Date().toISOString().slice(0, 10)}.json"`, "cache-control": "no-store" } });
});
