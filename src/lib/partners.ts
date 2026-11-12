import "server-only";
import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const demoFilter = () => (process.env.NODE_ENV === "production" ? [eq(schema.partners.isDemo, false)] : []);
/** Published = approved by an admin AND a partnership agreement confirmed on file. */
export const publishedPartner = () => and(eq(schema.partners.status, "APPROVED"), isNotNull(schema.partners.agreementConfirmedAt), ...demoFilter());
/** Visible recruiter = active with documented consent to publish contact details. */
export const visibleRecruiter = () => and(eq(schema.recruiters.active, true), isNotNull(schema.recruiters.consentConfirmedAt));

export async function listPartners() {
  const ps = await db.select().from(schema.partners).where(publishedPartner()).orderBy(desc(schema.partners.isDemo), schema.partners.name);
  if (!ps.length) return [];
  const rc = await db.select({ partnerId: schema.recruiters.partnerId, n: count() }).from(schema.recruiters)
    .where(and(inArray(schema.recruiters.partnerId, ps.map((p) => p.id)), visibleRecruiter())).groupBy(schema.recruiters.partnerId);
  const jobCounts = await Promise.all(ps.map((p) => openJobCount(p.jobCompanyNames.length ? p.jobCompanyNames : [p.name], p.isDemo)));
  return ps.map((p, i) => ({ ...p, recruiterCount: rc.find((r) => r.partnerId === p.id)?.n ?? 0, openJobs: jobCounts[i] }));
}

export async function openJobCount(names: string[], demo: boolean) {
  const [{ n }] = await db.select({ n: count() }).from(schema.jobs)
    .where(and(eq(schema.jobs.status, "ACTIVE"), eq(schema.jobs.isDemo, demo && process.env.NODE_ENV !== "production"), inArray(sql`lower(${schema.jobs.company})`, names.map((x) => x.toLowerCase()))));
  return n;
}

export async function partnerJobs(names: string[], demo: boolean, limit = 8) {
  return db.select({ id: schema.jobs.id, title: schema.jobs.title, location: schema.jobs.location, workMode: schema.jobs.workMode, applyUrl: schema.jobs.applyUrl, postedAt: schema.jobs.postedAt })
    .from(schema.jobs).where(and(eq(schema.jobs.status, "ACTIVE"), eq(schema.jobs.isDemo, demo && process.env.NODE_ENV !== "production"), inArray(sql`lower(${schema.jobs.company})`, names.map((x) => x.toLowerCase()))))
    .orderBy(desc(schema.jobs.postedAt)).limit(limit);
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
