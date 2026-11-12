import Link from "next/link";
import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePageAdmin } from "@/lib/auth";
import { Card, PageHeader, Stat, cx } from "@/components/ui";
import { DailyBars, HBars } from "@/components/charts/Charts";

export const metadata = { title: "Admin · Analytics" };
export const dynamic = "force-dynamic";

const EVENTS: Record<string, string> = {
  signup: "Sign-ups", onboarding_complete: "Finished onboarding", resume_upload: "Resumes uploaded", resume_analyze: "Resumes tailored to a job",
  resume_version_saved: "Tailored versions saved", job_saved: "Jobs saved", application_created: "Applications tracked", coach_message: "AI coach messages",
  assistant_question: "Site assistant questions", booking_requested: "Coach sessions requested", lesson_completed: "Lessons completed", partner_contacts_viewed: "Recruiter contacts viewed",
};
const RANGES = [7, 30, 90] as const;
const STATUS_LABEL: Record<string, string> = { SAVED: "Saved", PREPARING: "Preparing", APPLIED: "Applied", SCREENING: "Screening", INTERVIEWING: "Interviewing", OFFER: "Offer", REJECTED: "Rejected", WITHDRAWN: "Withdrawn" };

/** Fill missing days with 0 so the chart's time axis is honest. */
function series(rows: { day: string; n: number }[], days: number) {
  const m = new Map(rows.map((r) => [r.day, r.n])); const out: { day: string; n: number }[] = [];
  for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); out.push({ day: d, n: m.get(d) ?? 0 }); }
  return out;
}

export default async function AdminAnalytics({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requirePageAdmin();
  const days = (RANGES as readonly number[]).includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const since = new Date(Date.now() - days * 864e5); const sinceDay = since.toISOString().slice(0, 10);
  const prevSince = new Date(Date.now() - 2 * days * 864e5);
  const u = schema.users; const j = schema.jobs;
  const dayOf = (c: unknown) => sql<string>`to_char(${c} at time zone 'UTC', 'YYYY-MM-DD')`;

  const [[{ users }], [{ newUsers }], [{ prevUsers }], [{ active7 }], signups, usage, usageDaily, jobsDaily, bySource, byMode, byIndustry, apps, bookings] = await Promise.all([
    db.select({ users: count() }).from(u),
    db.select({ newUsers: count() }).from(u).where(gte(u.createdAt, since)),
    db.select({ prevUsers: count() }).from(u).where(and(gte(u.createdAt, prevSince), sql`${u.createdAt} < ${since}`)),
    db.select({ active7: count() }).from(u).where(gte(u.lastActiveAt, new Date(Date.now() - 7 * 864e5))),
    db.select({ day: dayOf(u.createdAt), n: sql<number>`count(*)::int` }).from(u).where(gte(u.createdAt, since)).groupBy(sql`1`),
    db.select({ event: schema.usageDaily.event, n: sql<number>`sum(${schema.usageDaily.count})::int` }).from(schema.usageDaily).where(gte(schema.usageDaily.day, sinceDay)).groupBy(schema.usageDaily.event),
    db.select({ day: sql<string>`${schema.usageDaily.day}::text`, n: sql<number>`sum(${schema.usageDaily.count})::int` }).from(schema.usageDaily).where(and(gte(schema.usageDaily.day, sinceDay), eq(schema.usageDaily.event, "resume_analyze"))).groupBy(schema.usageDaily.day),
    db.select({ day: dayOf(j.firstSeenAt), n: sql<number>`count(*)::int` }).from(j).where(and(eq(j.isDemo, false), gte(j.firstSeenAt, since))).groupBy(sql`1`),
    db.select({ name: j.sourceId, n: sql<number>`count(*)::int` }).from(j).where(and(eq(j.status, "ACTIVE"), eq(j.isDemo, false), isNull(j.hiddenAt))).groupBy(j.sourceId).orderBy(desc(sql`count(*)`)),
    db.select({ name: j.workMode, n: sql<number>`count(*)::int` }).from(j).where(and(eq(j.status, "ACTIVE"), eq(j.isDemo, false), isNull(j.hiddenAt))).groupBy(j.workMode).orderBy(desc(sql`count(*)`)),
    db.select({ name: j.industry, n: sql<number>`count(*)::int` }).from(j).where(and(eq(j.status, "ACTIVE"), eq(j.isDemo, false), isNull(j.hiddenAt))).groupBy(j.industry).orderBy(desc(sql`count(*)`)).limit(8),
    db.select({ name: schema.applications.status, n: sql<number>`count(*)::int` }).from(schema.applications).groupBy(schema.applications.status),
    db.select({ name: schema.bookings.status, n: sql<number>`count(*)::int` }).from(schema.bookings).where(gte(schema.bookings.createdAt, since)).groupBy(schema.bookings.status),
  ]);
  const ev = (k: string) => usage.find((x) => x.event === k)?.n ?? 0;
  const delta = prevUsers ? Math.round(((newUsers - prevUsers) / prevUsers) * 100) : null;
  const MODE: Record<string, string> = { REMOTE: "Remote", HYBRID: "Hybrid", ONSITE: "On-site", UNKNOWN: "Not stated" };
  const funnel = [["Signed up", ev("signup")], ["Finished onboarding", ev("onboarding_complete")], ["Uploaded a resume", ev("resume_upload")], ["Tailored to a job", ev("resume_analyze")], ["Tracked an application", ev("application_created")]] as const;
  const top = Math.max(1, ...funnel.map((f) => f[1]));

  return (
    <>
      <PageHeader kicker="Admin" title="Analytics" subtitle="Aggregate counts only. No individual user activity is recorded or shown." actions={
        <div className="glass inline-flex gap-1 p-1" role="group" aria-label="Date range">{RANGES.map((r) => <Link key={r} href={`/admin/analytics?days=${r}`} aria-current={r === days ? "true" : undefined} className={cx("rounded-lg px-3 py-1.5 text-sm", r === days ? "bg-white/10 text-white" : "text-slate-400 hover:text-white")}>{r} days</Link>)}</div>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`New accounts (${days}d)`} value={newUsers} hint={delta === null ? "No earlier period to compare" : `${delta >= 0 ? "+" : ""}${delta}% vs previous ${days} days`} />
        <Stat label="Active users (7d)" value={active7} hint={`${users} accounts total`} />
        <Stat label={`Resumes tailored (${days}d)`} value={ev("resume_analyze")} hint={`${ev("resume_upload")} resumes uploaded`} />
        <Stat label={`Coach sessions requested (${days}d)`} value={ev("booking_requested")} hint={`${ev("coach_message")} AI coach messages`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><h2 className="font-semibold">Sign-ups per day</h2><p className="mb-2 text-xs text-slate-400">Last {days} days</p><DailyBars data={series(signups, days)} label="Sign-ups" /></Card>
        <Card><h2 className="font-semibold">Resumes tailored per day</h2><p className="mb-2 text-xs text-slate-400">Last {days} days</p><DailyBars data={series(usageDaily, days)} label="Tailored" /></Card>
        <Card><h2 className="font-semibold">New live jobs per day</h2><p className="mb-2 text-xs text-slate-400">Real listings first seen each day (demo excluded)</p><DailyBars data={series(jobsDaily, days)} label="New jobs" /></Card>
        <Card>
          <h2 className="font-semibold">Journey</h2><p className="mb-4 text-xs text-slate-400">How many times each step happened in the last {days} days</p>
          <ul className="space-y-3">{funnel.map(([label, n]) => (
            <li key={label}><div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="tabular-nums text-slate-300">{n}</span></div>
              <div className="h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${(n / top) * 100}%` }} /></div></li>))}</ul>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Job board right now</h2>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card><h3 className="mb-2 text-sm font-semibold">Live jobs by source</h3>{bySource.length ? <HBars data={bySource} label="Jobs" /> : <p className="text-sm text-slate-400">No live jobs yet.</p>}</Card>
        <Card><h3 className="mb-2 text-sm font-semibold">Live jobs by work type</h3>{byMode.length ? <HBars data={byMode.map((m) => ({ name: MODE[m.name] ?? m.name, n: m.n }))} label="Jobs" /> : <p className="text-sm text-slate-400">No live jobs yet.</p>}</Card>
        <Card><h3 className="mb-2 text-sm font-semibold">Top industries</h3>{byIndustry.length ? <HBars data={byIndustry.map((i) => ({ name: i.name ?? "Other", n: i.n }))} label="Jobs" /> : <p className="text-sm text-slate-400">No live jobs yet.</p>}</Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><h3 className="mb-2 text-sm font-semibold">Applications tracked, by stage (all time)</h3>{apps.length ? <HBars data={apps.map((a) => ({ name: STATUS_LABEL[a.name] ?? a.name, n: a.n }))} label="Applications" /> : <p className="text-sm text-slate-400">No applications tracked yet.</p>}</Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold">All tracked activity ({days}d)</h3>
          <table className="w-full text-sm"><tbody>{Object.entries(EVENTS).map(([k, label]) => (
            <tr key={k} className="border-t border-white/5"><td className="py-1.5 text-slate-300">{label}</td><td className="py-1.5 text-right tabular-nums">{ev(k)}</td></tr>))}
            {bookings.map((b) => <tr key={b.name} className="border-t border-white/5"><td className="py-1.5 text-slate-300">Coach bookings: {b.name.toLowerCase()}</td><td className="py-1.5 text-right tabular-nums">{b.n}</td></tr>)}</tbody></table>
        </Card>
      </div>
    </>
  );
}
