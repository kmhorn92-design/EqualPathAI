import "server-only";
import { and, desc, eq, gte, ilike, or, sql, type SQL, inArray, count, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { z } from "zod";
import type { jobQuerySchema } from "../validation";

export const PAGE_SIZE = 20;
export const demoAllowed = () => process.env.NODE_ENV !== "production";

export async function searchJobs(q: z.infer<typeof jobQuerySchema>, userId?: string) {
  const j = schema.jobs;
  const where: SQL[] = [inArray(j.status, ["ACTIVE", "STALE"]), isNull(j.hiddenAt)];
  where.push(eq(j.isDemo, q.demo === "1" && demoAllowed()));
  let rank: SQL | undefined;
  if (q.q?.trim()) {
    const ts = sql`websearch_to_tsquery('english', ${q.q.trim()})`;
    where.push(sql`${j.searchVector} @@ ${ts}`);
    rank = sql`ts_rank(${j.searchVector}, ${ts})`;
  }
  if (q.industry) where.push(eq(j.industry, q.industry));
  if (q.workMode) where.push(eq(j.workMode, q.workMode));
  if (q.location) where.push(ilike(j.location, `%${q.location}%`));
  if (q.experience) where.push(eq(j.experienceLevel, q.experience));
  if (q.company) where.push(ilike(j.company, `%${q.company}%`));
  if (q.type) where.push(ilike(j.employmentType, `%${q.type}%`));
  if (q.salaryMin) where.push(or(gte(j.salaryMax, q.salaryMin), gte(j.salaryMin, q.salaryMin))!); // only jobs that DISCLOSE salary
  if (q.days) where.push(gte(sql`coalesce(${j.postedAt}, ${j.firstSeenAt})`, new Date(Date.now() - q.days * 864e5)));
  if (q.saved && userId) where.push(sql`exists (select 1 from saved_jobs s where s.job_id = ${j.id} and s.user_id = ${userId})`);
  const cond = and(...where);
  const [{ total }] = await db.select({ total: count() }).from(j).where(cond);
  const rows = await db.select({
    id: j.id, sourceId: j.sourceId, company: j.company, title: j.title, location: j.location, workMode: j.workMode, employmentType: j.employmentType,
    industry: j.industry, experienceLevel: j.experienceLevel, salaryMin: j.salaryMin, salaryMax: j.salaryMax, salaryCurrency: j.salaryCurrency, salaryPeriod: j.salaryPeriod,
    applyUrl: j.applyUrl, attribution: j.attribution, postedAt: j.postedAt, lastVerifiedAt: j.lastVerifiedAt, status: j.status, isDemo: j.isDemo,
    snippet: sql<string>`left(${j.description}, 320)`,
    saved: userId ? sql<boolean>`exists (select 1 from saved_jobs s where s.job_id = ${j.id} and s.user_id = ${userId})` : sql<boolean>`false`,
  }).from(j).where(cond).orderBy(...(rank ? [desc(rank)] : []), desc(sql`coalesce(${j.postedAt}, ${j.firstSeenAt})`)).limit(PAGE_SIZE).offset((q.page - 1) * PAGE_SIZE);
  return { total, rows };
}

export async function facets() {
  const j = schema.jobs;
  const live = and(eq(j.status, "ACTIVE"), eq(j.isDemo, false), isNull(j.hiddenAt));
  const [ind, lvl, last, [{ active }]] = await Promise.all([
    db.selectDistinct({ v: j.industry }).from(j).where(live),
    db.selectDistinct({ v: j.experienceLevel }).from(j).where(live),
    db.select({ t: sql<Date | null>`max(${j.lastVerifiedAt})` }).from(j).where(live),
    db.select({ active: count() }).from(j).where(live),
  ]);
  return { industries: ind.map((x) => x.v).filter(Boolean) as string[], levels: lvl.map((x) => x.v).filter(Boolean) as string[], lastVerified: last[0]?.t ?? null, active };
}
