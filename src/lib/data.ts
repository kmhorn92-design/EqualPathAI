import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { decryptJson } from "./crypto";
import type { KeywordAnalysis } from "./resume/types";

export async function listVersions(userId: string) {
  return db.select({ id: schema.resumeVersions.id, label: schema.resumeVersions.label, jobTitle: schema.resumeVersions.jobTitle, templateId: schema.resumeVersions.templateId,
    createdAt: schema.resumeVersions.createdAt, resumeId: schema.resumes.id, resumeTitle: schema.resumes.title, analysisEnc: schema.resumeVersions.analysisEnc })
    .from(schema.resumeVersions).innerJoin(schema.resumes, eq(schema.resumes.id, schema.resumeVersions.resumeId))
    .where(eq(schema.resumes.userId, userId)).orderBy(desc(schema.resumeVersions.createdAt));
}

/** Skill gaps = job keywords missing from the user's resume across their recent tailored versions. */
export async function skillGaps(userId: string) {
  const vs = (await listVersions(userId)).slice(0, 5);
  const counts = new Map<string, number>();
  for (const v of vs) {
    if (!v.analysisEnc) continue;
    try { const a = decryptJson<{ analysis?: KeywordAnalysis }>(v.analysisEnc).analysis; a?.missing.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1)); } catch { /* skip */ }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([skill, n]) => ({ skill, n }));
}

export async function recommendedJobs(userId: string, limit = 4) {
  const p = await db.query.profiles.findFirst({ where: eq(schema.profiles.userId, userId) });
  const conds = [eq(schema.jobs.status, "ACTIVE"), isNull(schema.jobs.hiddenAt)];
  if (p?.industries.length) conds.push(inArray(schema.jobs.industry, p.industries));
  if (p?.workPreference && p.workPreference !== "UNKNOWN") conds.push(eq(schema.jobs.workMode, p.workPreference));
  const live = process.env.NODE_ENV === "production" ? [eq(schema.jobs.isDemo, false)] : [];
  let rows = await db.select().from(schema.jobs).where(and(...conds, ...live)).orderBy(desc(schema.jobs.isDemo), desc(schema.jobs.postedAt)).limit(limit);
  if (!rows.length) rows = await db.select().from(schema.jobs).where(and(eq(schema.jobs.status, "ACTIVE"), isNull(schema.jobs.hiddenAt), ...live)).orderBy(desc(schema.jobs.postedAt)).limit(limit);
  return rows.sort((a, b) => Number(a.isDemo) - Number(b.isDemo));
}

export const appCounts = (userId: string) =>
  db.select({ status: schema.applications.status, count: sql<number>`count(*)::int` }).from(schema.applications).where(eq(schema.applications.userId, userId)).groupBy(schema.applications.status);
