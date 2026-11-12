import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { decryptJson, decryptOpt } from "@/lib/crypto";
import type { ResumeData } from "@/lib/resume/types";
import { llmEnabled } from "@/lib/llm";
import { Studio, type JobOption } from "@/components/resume/Studio";

export const metadata = { title: "Resume Studio" };
export default async function ResumeEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string; job?: string }> }) {
  const u = await requirePageUser();
  const { id } = await params; const { v, job } = await searchParams;
  const r = await db.query.resumes.findFirst({ where: and(eq(schema.resumes.id, id), eq(schema.resumes.userId, u.id)) });
  if (!r) notFound();
  const consent = await db.query.consents.findFirst({ where: eq(schema.consents.userId, u.id) });
  const versions = await db.select().from(schema.resumeVersions).where(eq(schema.resumeVersions.resumeId, r.id)).orderBy(asc(schema.resumeVersions.createdAt));
  // Jobs to tailor against: the user's saved jobs first, then recent listings (DEMO allowed only outside production).
  const demoOk = process.env.NODE_ENV !== "production";
  const savedIds = (await db.select({ id: schema.savedJobs.jobId }).from(schema.savedJobs).where(eq(schema.savedJobs.userId, u.id))).map((x) => x.id);
  const jobCols = { id: schema.jobs.id, title: schema.jobs.title, company: schema.jobs.company, description: schema.jobs.description, isDemo: schema.jobs.isDemo };
  const savedJobs = savedIds.length ? await db.select(jobCols).from(schema.jobs).where(inArray(schema.jobs.id, savedIds)) : [];
  const recent = await db.select(jobCols).from(schema.jobs).where(and(eq(schema.jobs.status, "ACTIVE"), isNull(schema.jobs.hiddenAt), ...(demoOk ? [] : [eq(schema.jobs.isDemo, false)]))).orderBy(asc(schema.jobs.isDemo), desc(schema.jobs.postedAt)).limit(25);
  const jobOptions: JobOption[] = [...savedJobs.map((j) => ({ ...j, saved: true })), ...recent.filter((j) => !savedIds.includes(j.id))].map((j) => ({ ...j, description: j.description.slice(0, 8000) }));
  const picked = job ? (jobOptions.find((j) => j.id === job) ?? (await db.select(jobCols).from(schema.jobs).where(eq(schema.jobs.id, job)).limit(1))[0]) : undefined;

  return (
    <Studio initialJob={picked ? { ...picked, description: picked.description.slice(0, 8000) } : undefined} jobOptions={jobOptions} resumeId={r.id} title={r.title} initial={decryptJson<ResumeData>(r.parsedEnc)} initialVersion={v} aiAvailable={llmEnabled() && !!consent?.aiProcessing}
      versions={versions.map((x) => ({ id: x.id, label: x.label, templateId: x.templateId, jobTitle: x.jobTitle, createdAt: x.createdAt.toISOString(),
        content: decryptJson<ResumeData>(x.contentEnc), jobDescription: decryptOpt(x.jobDescEnc), analysis: x.analysisEnc ? decryptJson(x.analysisEnc) : null }))} />
  );
}
