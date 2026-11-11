import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { decryptJson, decryptOpt } from "@/lib/crypto";
import type { ResumeData } from "@/lib/resume/types";
import { llmEnabled } from "@/lib/llm";
import { Studio } from "@/components/resume/Studio";

export const metadata = { title: "Resume Studio" };
export default async function ResumeEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const u = await requirePageUser();
  const { id } = await params; const { v } = await searchParams;
  const r = await db.query.resumes.findFirst({ where: and(eq(schema.resumes.id, id), eq(schema.resumes.userId, u.id)) });
  if (!r) notFound();
  const consent = await db.query.consents.findFirst({ where: eq(schema.consents.userId, u.id) });
  const versions = await db.select().from(schema.resumeVersions).where(eq(schema.resumeVersions.resumeId, r.id)).orderBy(asc(schema.resumeVersions.createdAt));
  return (
    <Studio resumeId={r.id} title={r.title} initial={decryptJson<ResumeData>(r.parsedEnc)} initialVersion={v} aiAvailable={llmEnabled() && !!consent?.aiProcessing}
      versions={versions.map((x) => ({ id: x.id, label: x.label, templateId: x.templateId, jobTitle: x.jobTitle, createdAt: x.createdAt.toISOString(),
        content: decryptJson<ResumeData>(x.contentEnc), jobDescription: decryptOpt(x.jobDescEnc), analysis: x.analysisEnc ? decryptJson(x.analysisEnc) : null }))} />
  );
}
