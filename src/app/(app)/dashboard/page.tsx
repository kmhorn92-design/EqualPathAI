import Link from "next/link";
import { and, count, desc, eq, gte, isNotNull } from "drizzle-orm";
import { Briefcase, Bookmark, FileText, Target, ClipboardCheck, GraduationCap, ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { appCounts, listVersions, recommendedJobs, skillGaps } from "@/lib/data";
import { LESSONS } from "@/content/lessons";
import { MODULES } from "@/content/assessments";
import { Card, DemoBadge, Empty, PageHeader, Progress, Stat } from "@/components/ui";
import { PipelineChart, ScoreChart } from "@/components/charts/Charts";

export const metadata = { title: "Dashboard" };
const ORDER = ["SAVED", "PREPARING", "APPLIED", "SCREENING", "INTERVIEWING", "OFFER"] as const;

export default async function Dashboard() {
  const u = await requirePageUser();
  const [counts, versions, gaps, recs, [saved], attempts, progress, reminders] = await Promise.all([
    appCounts(u.id), listVersions(u.id), skillGaps(u.id), recommendedJobs(u.id),
    db.select({ n: count() }).from(schema.savedJobs).where(eq(schema.savedJobs.userId, u.id)),
    db.select().from(schema.assessmentAttempts).where(eq(schema.assessmentAttempts.userId, u.id)).orderBy(desc(schema.assessmentAttempts.createdAt)).limit(12),
    db.select().from(schema.lessonProgress).where(and(eq(schema.lessonProgress.userId, u.id), eq(schema.lessonProgress.completed, true))),
    db.select().from(schema.applications).where(and(eq(schema.applications.userId, u.id), isNotNull(schema.applications.reminderAt), gte(schema.applications.reminderAt, new Date(Date.now() - 864e5)))).orderBy(schema.applications.reminderAt).limit(4),
  ]);
  const total = counts.reduce((s, c) => s + c.count, 0);
  const pipeline = ORDER.map((s) => ({ status: s[0] + s.slice(1).toLowerCase(), count: counts.find((c) => c.status === s)?.count ?? 0 }));
  const scoreData = [...attempts].reverse().filter((a) => a.total > 0).map((a) => ({ label: MODULES.find((m) => m.id === a.module)?.title.split(" ")[0] ?? a.module, pct: Math.round((a.score / a.total) * 100) }));
  const nextLesson = LESSONS.find((l) => !progress.some((p) => p.lessonId === l.id));
  const tried = new Set(attempts.map((a) => a.module));
  const nextModule = MODULES.find((m) => !tried.has(m.id));

  const actions = [
    !versions.length && { href: "/resume", label: "Upload your resume to Resume Studio", icon: FileText },
    versions.length && !total && { href: "/jobs", label: "Find a verified job and tailor a version for it", icon: Briefcase },
    nextModule && { href: `/assessments/${nextModule.id}`, label: `Try ${nextModule.title} practice`, icon: ClipboardCheck },
    nextLesson && { href: `/learn/${nextLesson.id}`, label: `Learn: ${nextLesson.title}`, icon: GraduationCap },
  ].filter(Boolean) as { href: string; label: string; icon: typeof FileText }[];

  return (
    <>
      <PageHeader kicker="Dashboard" title={`Hi${u.name ? `, ${u.name.split(" ")[0]}` : ""} 👋`} subtitle="Here's your path at a glance."
        actions={<><Link href="/resume" className="btn-primary"><FileText size={16} />Resume Studio</Link><Link href="/jobs" className="btn-ghost"><Briefcase size={16} />Jobs</Link></>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Applications" value={total} icon={<Briefcase size={16} className="text-violet-300" />} hint={`${pipeline.find((p) => p.status === "Interviewing")?.count ?? 0} interviewing`} />
        <Stat label="Saved jobs" value={saved.n} icon={<Bookmark size={16} className="text-cyan-300" />} />
        <Stat label="Resume versions" value={versions.length} icon={<FileText size={16} className="text-violet-300" />} />
        <Stat label="Lessons done" value={`${progress.length}/${LESSONS.length}`} icon={<GraduationCap size={16} className="text-cyan-300" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Application pipeline</h2><Link href="/tracker" className="text-sm text-cyan-300">Open tracker →</Link></div>
          {total ? <PipelineChart data={pipeline} /> : <Empty title="No applications yet" body="Track jobs you apply to and get follow-up reminders." action={<Link href="/tracker" className="btn-ghost">Add an application</Link>} />}
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-cyan-300" />Recommended next steps</h2>
          <ul className="space-y-2">{actions.slice(0, 4).map(({ href, label, icon: Icon }) => (
            <li key={href}><Link href={href} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm transition hover:border-violet-400/40"><Icon size={16} className="shrink-0 text-violet-300" /><span className="flex-1">{label}</span><ArrowRight size={14} className="text-slate-500" /></Link></li>
          ))}</ul>
          {reminders.length > 0 && <div className="mt-4 border-t border-white/5 pt-3"><h3 className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-400"><CalendarClock size={13} />Follow-ups</h3>
            {reminders.map((r) => <Link href="/tracker" key={r.id} className="block py-1 text-sm"><span className="text-slate-200">{r.company}</span> <span className="text-slate-500">· {r.reminderAt!.toLocaleDateString()}</span></Link>)}</div>}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><Target size={16} className="text-amber-300" />Skill gaps</h2>
          <p className="mb-3 text-xs text-slate-500">Keywords from job posts you tailored for that don&apos;t appear in your resume. Learn them or check whether you already have them.</p>
          {gaps.length ? <div className="flex flex-wrap gap-1.5">{gaps.slice(0, 14).map((g) => <span key={g.skill} className="chip-amber">{g.skill}{g.n > 1 && ` ×${g.n}`}</span>)}</div>
            : <p className="text-sm text-slate-400">Tailor a resume to a job description to see gaps here.</p>}
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><ClipboardCheck size={16} className="text-cyan-300" />Practice scores</h2>
          {scoreData.length ? <ScoreChart data={scoreData} /> : <Empty title="No practice yet" action={<Link href="/assessments" className="btn-ghost">Start practicing</Link>} />}
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><GraduationCap size={16} className="text-violet-300" />Learning progress</h2>
          <Progress value={progress.length} max={LESSONS.length} label="Learning Hub" />
          <ul className="mt-4 space-y-2 text-sm">{LESSONS.slice(0, 5).map((l) => { const done = progress.some((p) => p.lessonId === l.id); return (
            <li key={l.id}><Link href={`/learn/${l.id}`} className="flex items-center justify-between hover:text-white"><span className={done ? "text-slate-500 line-through" : "text-slate-300"}>{l.title}</span><span className="text-xs text-slate-500">{l.minutes}m</span></Link></li>); })}</ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Resume versions</h2><Link href="/resume" className="text-sm text-cyan-300">All →</Link></div>
          {versions.length ? <ul className="divide-y divide-white/5">{versions.slice(0, 5).map((v) => (
            <li key={v.id}><Link href={`/resume/${v.resumeId}?v=${v.id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-white"><span>{v.label}{v.jobTitle && <span className="text-slate-500"> · {v.jobTitle}</span>}</span><span className="text-xs text-slate-500">{v.createdAt.toLocaleDateString()}</span></Link></li>))}</ul>
            : <Empty title="No resumes yet" action={<Link href="/resume" className="btn-primary">Upload resume</Link>} />}
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Jobs for your goals</h2><Link href="/jobs" className="text-sm text-cyan-300">Job board →</Link></div>
          {recs.length ? <ul className="divide-y divide-white/5">{recs.map((j) => (
            <li key={j.id} className="py-2.5 text-sm"><Link href={`/jobs?q=${encodeURIComponent(j.title.replace("[DEMO] ", ""))}`} className="hover:text-white"><span className="font-medium">{j.title}</span> {j.isDemo && <DemoBadge />}</Link><div className="text-xs text-slate-500">{j.company} · {j.location}</div></li>))}</ul>
            : <Empty title="No live listings yet" body="An admin needs to connect authorized job sources. We never fill this with fake jobs." />}
        </Card>
      </div>
    </>
  );
}
