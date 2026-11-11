import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler } from "@/lib/api";
import { decryptJson, decryptOpt, encryptJson } from "@/lib/crypto";
import { deleteObject } from "@/lib/storage";
import { ownResume } from "@/lib/resume/access";
import { resumeDataSchema, type ResumeData } from "@/lib/resume/types";

type P = { id: string };

export const GET = handler<P>(async ({ user, params }) => {
  const r = await ownResume(user.id, params.id);
  const versions = await db.select().from(schema.resumeVersions).where(eq(schema.resumeVersions.resumeId, r.id)).orderBy(asc(schema.resumeVersions.createdAt));
  return {
    resume: { id: r.id, title: r.title, originalName: r.originalName, createdAt: r.createdAt, data: decryptJson<ResumeData>(r.parsedEnc) },
    versions: versions.map((v) => ({ id: v.id, label: v.label, templateId: v.templateId, jobTitle: v.jobTitle, createdAt: v.createdAt,
      content: decryptJson<ResumeData>(v.contentEnc), jobDescription: decryptOpt(v.jobDescEnc), analysis: v.analysisEnc ? decryptJson(v.analysisEnc) : null })),
  };
});

export const PATCH = handler<P>(async ({ req, user, params }) => {
  const r = await ownResume(user.id, params.id);
  const input = await body(req, z.object({ title: z.string().trim().min(1).max(120).optional(), data: resumeDataSchema.optional() }));
  await db.update(schema.resumes).set({ ...(input.title ? { title: input.title } : {}), ...(input.data ? { parsedEnc: encryptJson(input.data) } : {}) }).where(eq(schema.resumes.id, r.id));
  return { ok: true };
});

export const DELETE = handler<P>(async ({ user, params }) => {
  const r = await ownResume(user.id, params.id);
  if (r.storageKey) await deleteObject(r.storageKey).catch(() => {});
  await db.delete(schema.resumes).where(eq(schema.resumes.id, r.id));
  return { ok: true };
});
