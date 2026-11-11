import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler, HttpError } from "@/lib/api";
import { decryptJson } from "@/lib/crypto";
import { coachForUser } from "@/lib/bookings-server";
import type { ResumeData } from "@/lib/resume/types";
import { audit } from "@/lib/usage";

/** The coach can read ONLY the resume version the client chose to share, and only while the session is active. */
export const GET = handler<{ id: string }>(async ({ user, params }) => {
  const b = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, params.id) });
  const myCoach = await coachForUser(user.id);
  if (!b || myCoach?.id !== b.coachId) throw new HttpError(404, "Session not found");
  if (!b.sharedResumeVersionId || !["REQUESTED", "CONFIRMED"].includes(b.status)) throw new HttpError(404, "No resume was shared for this session.");
  const v = await db.query.resumeVersions.findFirst({ where: eq(schema.resumeVersions.id, b.sharedResumeVersionId) });
  if (!v) throw new HttpError(404, "The shared resume was deleted by its owner.");
  await audit(user.id, "booking.resume_viewed", b.id);
  return { label: v.label, templateId: v.templateId, content: decryptJson<ResumeData>(v.contentEnc) };
});
