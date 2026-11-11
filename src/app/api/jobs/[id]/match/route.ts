import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler, HttpError } from "@/lib/api";
import { decryptJson } from "@/lib/crypto";
import { resumeCorpus } from "@/lib/resume/parse";
import type { ResumeData } from "@/lib/resume/types";
import { explainMatch } from "@/lib/jobs/match";

export const GET = handler<{ id: string }>(async ({ user, params }) => {
  const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, params.id) });
  if (!job) throw new HttpError(404, "Job not found");
  const profile = await db.query.profiles.findFirst({ where: eq(schema.profiles.userId, user.id) });
  const latest = await db.select({ enc: schema.resumes.parsedEnc }).from(schema.resumes).where(eq(schema.resumes.userId, user.id)).orderBy(desc(schema.resumes.updatedAt)).limit(1);
  const resumeText = latest[0] ? resumeCorpus(decryptJson<ResumeData>(latest[0].enc)) : "";
  return explainMatch(`${job.title}\n${job.description}`, profile?.skills ?? [], resumeText, { workPreference: profile?.workPreference, location: profile?.location }, job);
});
