import { and, eq, gte, lt, notInArray, inArray, sql, isNotNull, isNull, count } from "drizzle-orm";
import { db, schema } from "@/db";
import { ADAPTERS, DAILY_TARGET } from "./registry";
import { canonicalKey, dedupe, validateJob } from "./normalize";
import type { JobAdapter, NormalizedJob } from "./types";

const STALE_AFTER_H = Number(process.env.JOB_STALE_AFTER_HOURS ?? 48);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, attempts = 3, baseMs = 1000): Promise<{ value: T; attempts: number }> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try { return { value: await fn(i), attempts: i }; } catch (e) {
      last = e;
      const status = (e as { status?: number }).status;
      if (status && status >= 400 && status < 500 && status !== 429) break; // don't retry auth/permission errors
      if (i < attempts) await sleep(baseMs * 2 ** (i - 1) + Math.random() * 250);
    }
  }
  throw Object.assign(last as Error, { attempts });
}

/** Keep the JobSource table in sync with adapter declarations (declarations live in code). */
export async function syncSources() {
  for (const a of ADAPTERS) {
    const vals = {
      name: a.name, authMethod: a.authorization.method, cadence: a.cadence, attribution: a.attribution,
      permittedFields: a.permittedFields as string[], requiresApproval: a.requiresPartnerApproval,
      configJson: { envVars: a.authorization.envVars, termsUrl: a.authorization.termsUrl, notes: a.authorization.notes, isDemo: !!a.isDemo },
    };
    await db.insert(schema.jobSources).values({ id: a.id, enabled: a.configured(), ...vals })
      .onConflictDoUpdate({ target: schema.jobSources.id, set: { ...vals, enabled: a.configured() } });
  }
}

/** Only store fields the source permits us to store. */
function restrict(j: NormalizedJob, a: JobAdapter): NormalizedJob {
  const allowed = new Set<string>([...a.permittedFields, "sourceJobId", "title", "company", "applyUrl"]);
  const out = { ...j } as Record<string, unknown>;
  for (const k of Object.keys(out)) if (!allowed.has(k)) out[k] = k === "description" || k === "location" ? "" : k === "workMode" ? "UNKNOWN" : null;
  return out as NormalizedJob;
}

export type SourceResult = { sourceId: string; status: string; fetched: number; inserted: number; updated: number; duplicates: number; rejected: number; markedStale: number; error?: string };

export async function runSource(a: JobAdapter, actor = "scheduler"): Promise<SourceResult> {
  const [run] = await db.insert(schema.ingestionRuns).values({ sourceId: a.id }).returning();
  const res: SourceResult = { sourceId: a.id, status: "SUCCESS", fetched: 0, inserted: 0, updated: 0, duplicates: 0, rejected: 0, markedStale: 0 };
  const logs: string[] = [];
  try {
    const src = await db.query.jobSources.findFirst({ where: eq(schema.jobSources.id, a.id) });
    if (src?.pausedAt) {
      res.status = "SKIPPED"; res.error = "Paused by an admin";
    } else if (!a.configured()) {
      res.status = "SKIPPED";
      res.error = a.requiresPartnerApproval ? "Partner approval/credentials not present" : `Not configured (set ${a.authorization.envVars.join(", ")})`;
    } else {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 120_000);
      const { value: raw, attempts } = await withRetry(() => a.fetchJobs({ signal: ctrl.signal, log: (m) => logs.push(m) })).finally(() => clearTimeout(timer));
      await db.update(schema.ingestionRuns).set({ attempts }).where(eq(schema.ingestionRuns.id, run.id));
      res.fetched = raw.length;
      const valid: NormalizedJob[] = [];
      for (const j of raw) { const v = validateJob(restrict(j, a)); if (v.ok) valid.push(v.job); else res.rejected++; }
      const { jobs, duplicates } = dedupe(valid);
      res.duplicates = duplicates;
      const now = new Date();
      const seen: string[] = [];
      for (const j of jobs) {
        const key = canonicalKey(j);
        // Cross-source dedup: if another source already owns this canonical key, just re-verify it.
        const existing = await db.query.jobs.findFirst({ where: eq(schema.jobs.canonicalKey, key), columns: { id: true, sourceId: true, sourceJobId: true } });
        if (existing && (existing.sourceId !== a.id || existing.sourceJobId !== j.sourceJobId)) {
          res.duplicates++;
          if (existing.sourceId === a.id) seen.push(existing.sourceJobId);
          await db.update(schema.jobs).set({ lastVerifiedAt: now, status: "ACTIVE" }).where(eq(schema.jobs.id, existing.id));
          continue;
        }
        const row = {
          sourceId: a.id, sourceJobId: j.sourceJobId, canonicalKey: key, company: j.company, title: j.title, location: j.location, workMode: j.workMode,
          employmentType: j.employmentType ?? null, industry: j.industry ?? null, experienceLevel: j.experienceLevel ?? null,
          salaryMin: j.salaryMin ?? null, salaryMax: j.salaryMax ?? null, salaryCurrency: j.salaryCurrency ?? null, salaryPeriod: j.salaryPeriod ?? null,
          description: j.description, applyUrl: j.applyUrl, attribution: a.attribution, postedAt: j.postedAt ?? null, expiresAt: j.expiresAt ?? null,
          lastVerifiedAt: now, status: "ACTIVE" as const, isDemo: !!a.isDemo,
        };
        const [r] = await db.insert(schema.jobs).values(row)
          .onConflictDoUpdate({ target: [schema.jobs.sourceId, schema.jobs.sourceJobId], set: { ...row, firstSeenAt: sql`${schema.jobs.firstSeenAt}` } })
          .returning({ inserted: sql<boolean>`(xmax = 0)` });
        if (r.inserted) res.inserted++; else res.updated++;
        seen.push(j.sourceJobId);
      }
      // Complete feeds only: a listing the source no longer returns has closed. (Partial feeds like Adzuna or
      // Jobicy return just the newest jobs, so "missing" means nothing there; those age out in sweepFreshness.)
      if (a.completeFeed && (seen.length || raw.length === 0)) {
        const gone = await db.update(schema.jobs).set({ status: "UNAVAILABLE" })
          .where(and(eq(schema.jobs.sourceId, a.id), eq(schema.jobs.status, "ACTIVE"), seen.length ? notInArray(schema.jobs.sourceJobId, seen) : sql`true`))
          .returning({ id: schema.jobs.id });
        res.markedStale += gone.length;
      }
      await db.update(schema.jobSources).set({ lastSuccessAt: now }).where(eq(schema.jobSources.id, a.id));
    }
  } catch (e) {
    res.status = "FAILED"; const ce = (e as { cause?: Error }).cause; res.error = (ce?.message ? `${ce.message} — ` : "") + (e as Error).message.slice(0, 300);
    await db.insert(schema.alerts).values({ level: "warning", kind: "SOURCE_FAILED", message: `${a.name}: ${res.error}` });
  }
  await db.update(schema.ingestionRuns).set({
    status: res.status as "SUCCESS", finishedAt: new Date(), fetched: res.fetched, inserted: res.inserted, updated: res.updated,
    duplicates: res.duplicates, rejected: res.rejected, markedStale: res.markedStale, error: [res.error, ...logs].filter(Boolean).join("\n").slice(0, 4000) || null,
  }).where(eq(schema.ingestionRuns.id, run.id));
  await db.update(schema.jobSources).set({ lastRunAt: new Date() }).where(eq(schema.jobSources.id, a.id));
  await db.insert(schema.auditLogs).values({ actor, action: "ingest.source", target: a.id, detail: res });
  return res;
}

/** Freshness sweep: expire past-deadline jobs; flag unverified jobs as stale. */
export async function sweepFreshness() {
  const now = new Date();
  const expired = await db.update(schema.jobs).set({ status: "EXPIRED" })
    .where(and(isNotNull(schema.jobs.expiresAt), lt(schema.jobs.expiresAt, now), notInArray(schema.jobs.status, ["EXPIRED"]))).returning({ id: schema.jobs.id });
  // Repair: partial-feed jobs are never "missing" — un-hide any an older version wrongly marked unavailable.
  const maxAgeDaysR = Number(process.env.JOB_PARTIAL_MAX_AGE_DAYS ?? 14);
  const partialIds = ADAPTERS.filter((a) => !a.completeFeed).map((a) => a.id);
  if (partialIds.length) await db.update(schema.jobs).set({ status: "ACTIVE" })
    .where(and(inArray(schema.jobs.sourceId, partialIds), eq(schema.jobs.status, "UNAVAILABLE"), gte(schema.jobs.lastVerifiedAt, new Date(now.getTime() - maxAgeDaysR * 864e5))));
  const stale = await db.update(schema.jobs).set({ status: "STALE" })
    .where(and(eq(schema.jobs.status, "ACTIVE"), lt(schema.jobs.lastVerifiedAt, new Date(now.getTime() - STALE_AFTER_H * 36e5)))).returning({ id: schema.jobs.id });
  // Partial-feed jobs that haven't been seen again for a long time are treated as closed.
  const maxAgeDays = Number(process.env.JOB_PARTIAL_MAX_AGE_DAYS ?? 14);
  const partial = ADAPTERS.filter((a) => !a.completeFeed).map((a) => a.id);
  const aged = partial.length ? await db.update(schema.jobs).set({ status: "UNAVAILABLE" })
    .where(and(inArray(schema.jobs.sourceId, partial), inArray(schema.jobs.status, ["ACTIVE", "STALE"]), lt(schema.jobs.lastVerifiedAt, new Date(now.getTime() - maxAgeDays * 864e5))))
    .returning({ id: schema.jobs.id }) : [];
  return { expired: expired.length, stale: stale.length, aged: aged.length };
}

export async function liveCounts() {
  const since = new Date(Date.now() - 864e5);
  const [active] = await db.select({ n: count() }).from(schema.jobs).where(and(eq(schema.jobs.status, "ACTIVE"), eq(schema.jobs.isDemo, false)));
  const [fresh] = await db.select({ n: count() }).from(schema.jobs).where(and(eq(schema.jobs.status, "ACTIVE"), eq(schema.jobs.isDemo, false), gte(schema.jobs.firstSeenAt, since)));
  return { active: active.n, newToday: fresh.n };
}

async function notify(message: string) {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try { await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: `[EqualPath AI] ${message}` }) }); } catch { /* best effort */ }
}

export async function runAll(actor = "scheduler") {
  await syncSources();
  const results: SourceResult[] = [];
  for (const a of ADAPTERS) results.push(await runSource(a, actor));
  const sweep = await sweepFreshness();
  const counts = await liveCounts();
  if (counts.newToday < DAILY_TARGET) {
    const msg = `Only ${counts.newToday} new verified live listings in the last 24h (target ${DAILY_TARGET}; ${counts.active} active total). Demo jobs are never counted. Configure more authorized sources.`;
    const open = await db.query.alerts.findFirst({ where: and(eq(schema.alerts.kind, "LOW_JOB_COUNT"), isNull(schema.alerts.resolvedAt)) });
    if (open) await db.update(schema.alerts).set({ message: msg, level: counts.active === 0 ? "critical" : "warning", createdAt: new Date() }).where(eq(schema.alerts.id, open.id));
    else await db.insert(schema.alerts).values({ level: counts.active === 0 ? "critical" : "warning", kind: "LOW_JOB_COUNT", message: msg });
    await notify(msg);
  }
  await db.insert(schema.auditLogs).values({ actor, action: "ingest.complete", detail: { sweep, counts, sources: results.map((r) => `${r.sourceId}:${r.status}`) } });
  return { results, sweep, counts };
}
