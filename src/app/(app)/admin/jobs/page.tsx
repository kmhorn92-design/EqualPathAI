import Link from "next/link";
import { and, count, desc, eq, gte, ilike, isNotNull, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { ExternalLink, Search } from "lucide-react";
import { db, schema } from "@/db";
import { requirePageAdmin } from "@/lib/auth";
import { ADAPTERS, DAILY_TARGET } from "@/lib/jobs/registry";
import { Card, DemoBadge, PageHeader, Stat, cx } from "@/components/ui";
import { RunIngest } from "@/components/admin/AdminActions";
import { JobActions, SourcePause } from "@/components/admin/AdminControls";

export const metadata = { title: "Admin · Job board" };
export const dynamic = "force-dynamic";
const PAGE = 30;
const ago = (d: Date | null) => { if (!d) return "never"; const h = (Date.now() - d.getTime()) / 36e5; return h < 1 ? "<1h ago" : h < 48 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)}d ago`; };

export default async function AdminJobs({ searchParams }: { searchParams: Promise<{ q?: string; source?: string; status?: string; show?: string; page?: string }> }) {
  await requirePageAdmin();
  const sp = await searchParams;
  const j = schema.jobs;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim().slice(0, 100);
  const where: SQL[] = [];
  if (q) where.push(or(ilike(j.title, `%${q}%`), ilike(j.company, `%${q}%`))!);
  if (sp.source) where.push(eq(j.sourceId, sp.source));
  if (sp.status && ["ACTIVE", "STALE", "UNAVAILABLE", "EXPIRED"].includes(sp.status)) where.push(eq(j.status, sp.status as "ACTIVE"));
  if (sp.show === "hidden") where.push(isNotNull(j.hiddenAt));
  else if (sp.show !== "all") where.push(isNull(j.hiddenAt));
  if (!sp.show) where.push(eq(j.isDemo, false)); // "On the board" = real listings only
  if (sp.show === "demo") where.push(eq(j.isDemo, true));
  const cond = and(...where);
  const day = new Date(Date.now() - 864e5);
  const live = and(eq(j.status, "ACTIVE"), eq(j.isDemo, false), isNull(j.hiddenAt));

  const [[{ total }], rows, sources, perSource, [{ visible }], [{ fresh }], [{ hidden }], log] = await Promise.all([
    db.select({ total: count() }).from(j).where(cond),
    db.select({ id: j.id, title: j.title, company: j.company, location: j.location, sourceId: j.sourceId, status: j.status, workMode: j.workMode, industry: j.industry, postedAt: j.postedAt, firstSeenAt: j.firstSeenAt, applyUrl: j.applyUrl, isDemo: j.isDemo, hiddenAt: j.hiddenAt, hiddenReason: j.hiddenReason, hiddenBy: j.hiddenBy })
      .from(j).where(cond).orderBy(desc(sql`coalesce(${j.postedAt}, ${j.firstSeenAt})`)).limit(PAGE).offset((page - 1) * PAGE),
    db.select().from(schema.jobSources).orderBy(schema.jobSources.name),
    db.select({ sourceId: j.sourceId, n: count() }).from(j).where(live).groupBy(j.sourceId),
    db.select({ visible: count() }).from(j).where(live),
    db.select({ fresh: count() }).from(j).where(and(live, gte(j.firstSeenAt, day))),
    db.select({ hidden: count() }).from(j).where(isNotNull(j.hiddenAt)),
    db.select().from(schema.auditLogs).where(or(like(schema.auditLogs.action, "job.%"), like(schema.auditLogs.action, "source.%"))).orderBy(desc(schema.auditLogs.createdAt)).limit(10),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: Record<string, string | undefined>) => "/admin/jobs?" + new URLSearchParams(Object.entries({ q, source: sp.source, status: sp.status, show: sp.show, ...p }).filter(([, v]) => v) as [string, string][]).toString();
  const count0 = (id: string) => perSource.find((x) => x.sourceId === id)?.n ?? 0;

  return (
    <>
      <PageHeader kicker="Admin" title="Job board controls" subtitle="Run and pause sources, and hide listings that are spam, duplicates, filled, or break the fair-hiring rules." actions={<RunIngest label="Run all sources" />} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Live listings on the board" value={visible} hint="Real jobs only. Demo and hidden excluded." />
        <Stat label="New in the last 24h" value={fresh} hint={fresh < DAILY_TARGET ? `Below the ${DAILY_TARGET}/day target` : `Meets the ${DAILY_TARGET}/day target`} />
        <Stat label="Hidden by admins" value={hidden} />
      </div>

      <Card className="mt-6 overflow-x-auto">
        <h2 className="mb-1 font-semibold">Sources</h2>
        <p className="mb-3 text-xs text-slate-400">Keys stay in <code>.env</code>. Pausing stops a source from running without removing its jobs. Respect each source&apos;s limits: Jobicy at most once an hour, Remotive about 4 times a day.</p>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-2">Source</th><th>State</th><th>Live jobs</th><th>Last run</th><th>Last success</th><th className="text-right">Controls</th></tr></thead>
          <tbody>{sources.map((s) => {
            const a = ADAPTERS.find((x) => x.id === s.id); const cfg = s.configJson as { envVars?: string[]; isDemo?: boolean };
            const state = s.pausedAt ? <span className="chip-amber">Paused</span> : s.enabled ? <span className="chip-green">Connected</span> : <span className="text-xs text-slate-500">Needs {cfg.envVars?.join(", ") || "setup"}</span>;
            return (
              <tr key={s.id} className="border-t border-white/5">
                <td className="py-2.5"><span className="font-medium">{s.name}</span>{cfg.isDemo && <span className="ml-2"><DemoBadge /></span>}<div className="text-xs text-slate-500">{s.attribution}</div></td>
                <td className="py-2.5">{state}</td>
                <td className="py-2.5">{count0(s.id)}</td>
                <td className="py-2.5 text-xs text-slate-400">{ago(s.lastRunAt)}</td>
                <td className="py-2.5 text-xs text-slate-400">{ago(s.lastSuccessAt)}</td>
                <td className="py-2.5 text-right"><span className="inline-flex gap-1.5">{s.enabled && <SourcePause id={s.id} paused={!!s.pausedAt} />}{a && s.enabled && !s.pausedAt && <RunIngest sourceId={s.id} />}</span></td>
              </tr>); })}</tbody>
        </table>
        {sources.length === 0 && <p className="text-sm text-slate-400">No sources registered yet. Click “Run all sources” once.</p>}
      </Card>

      <Card className="mt-6">
        <form className="flex flex-wrap items-end gap-3" action="/admin/jobs">
          <label className="min-w-[220px] flex-1 text-sm"><span className="mb-1 block text-xs text-slate-400">Search title or company</span>
            <span className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input name="q" defaultValue={q} className="input pl-8" placeholder="e.g. nurse, Amazon" /></span></label>
          <label className="text-sm"><span className="mb-1 block text-xs text-slate-400">Source</span>
            <select name="source" defaultValue={sp.source ?? ""} className="input w-auto"><option value="">All</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="text-sm"><span className="mb-1 block text-xs text-slate-400">Status</span>
            <select name="status" defaultValue={sp.status ?? ""} className="input w-auto"><option value="">Any</option><option value="ACTIVE">Active</option><option value="STALE">Stale</option><option value="UNAVAILABLE">Unavailable</option><option value="EXPIRED">Expired</option></select></label>
          <label className="text-sm"><span className="mb-1 block text-xs text-slate-400">Show</span>
            <select name="show" defaultValue={sp.show ?? ""} className="input w-auto"><option value="">On the board</option><option value="hidden">Hidden only</option><option value="demo">Demo only</option><option value="all">Everything</option></select></label>
          <button className="btn-primary">Filter</button>
          {(q || sp.source || sp.status || sp.show) && <Link href="/admin/jobs" className="btn-ghost">Clear</Link>}
        </form>
      </Card>

      <Card className="mt-6 overflow-x-auto">
        <p className="mb-3 text-sm text-slate-400">{total} listing{total === 1 ? "" : "s"}</p>
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-2">Listing</th><th>Source</th><th>Type</th><th>Posted</th><th>Status</th><th className="text-right">Moderation</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className={cx("border-t border-white/5 align-top", r.hiddenAt && "bg-rose-500/[0.04]")}>
              <td className="max-w-[340px] py-3"><a href={r.applyUrl} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-cyan-200">{r.title}<ExternalLink size={11} className="ml-1 inline text-slate-500" /></a>
                <div className="text-xs text-slate-400">{r.company} · {r.location || "—"}{r.isDemo && <span className="ml-2"><DemoBadge /></span>}</div>
                {r.hiddenAt && <div className="mt-1 text-xs text-rose-300">Hidden: {r.hiddenReason} · by {r.hiddenBy}</div>}</td>
              <td className="py-3 text-xs text-slate-400">{r.sourceId}</td>
              <td className="py-3 text-xs text-slate-400">{[r.workMode !== "UNKNOWN" ? r.workMode.toLowerCase() : null, r.industry].filter(Boolean).join(" · ") || "—"}</td>
              <td className="py-3 text-xs text-slate-400">{(r.postedAt ?? r.firstSeenAt).toLocaleDateString()}</td>
              <td className="py-3 text-xs">{r.status.toLowerCase()}</td>
              <td className="py-3 text-right"><JobActions id={r.id} hidden={!!r.hiddenAt} /></td>
            </tr>))}</tbody>
        </table>
        {rows.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No listings match.</p>}
        {pages > 1 && <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link className="btn-ghost" href={link({ page: String(page - 1) })}>← Previous</Link> : <span />}
          <span className="text-slate-400">Page {page} of {pages}</span>
          {page < pages ? <Link className="btn-ghost" href={link({ page: String(page + 1) })}>Next →</Link> : <span />}</div>}
      </Card>

      <Card className="mt-6">
        <h2 className="mb-3 font-semibold">Recent job board actions</h2>
        {log.length === 0 ? <p className="text-sm text-slate-400">No moderation actions yet.</p> : (
          <ul className="divide-y divide-white/5 text-sm">{log.map((l) => { const d = l.detail as { title?: string; company?: string; reason?: string }; return (
            <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2"><span><b className="text-white">{l.action}</b> {d.title ? `${d.title} · ${d.company}` : l.target}{d.reason && <span className="text-slate-400"> · {d.reason}</span>}</span><span className="text-xs text-slate-500">{l.actor.replace("admin:", "")} · {l.createdAt.toLocaleString()}</span></li>); })}</ul>)}
      </Card>
    </>
  );
}
