import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, XCircle, MinusCircle, Lock } from "lucide-react";
import { db, schema } from "@/db";
import { requirePageAdmin } from "@/lib/auth";
import { ADAPTERS, DAILY_TARGET } from "@/lib/jobs/registry";
import { Card, DemoBadge, PageHeader, Stat, cx } from "@/components/ui";
import { PipelineChart } from "@/components/charts/Charts";
import { Moderate, NewArticle, Resolve, RunIngest, VerifyCredential } from "@/components/admin/AdminActions";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const statusIcon = (s: string) => s === "SUCCESS" ? <CheckCircle2 size={14} className="text-emerald-300" /> : s === "FAILED" ? <XCircle size={14} className="text-rose-300" /> : s === "SKIPPED" ? <MinusCircle size={14} className="text-slate-500" /> : <AlertTriangle size={14} className="text-amber-300" />;
const ago = (d: Date | null) => (d ? `${Math.round((Date.now() - d.getTime()) / 36e5)}h ago` : "never");

export default async function Admin() {
  await requirePageAdmin();
  const j = schema.jobs; const day = new Date(Date.now() - 864e5);
  const [sources, runs, alerts, byStatus, [newToday], pendingCoaches, coaches, articles, usage, [users], dupes] = await Promise.all([
    db.select().from(schema.jobSources),
    db.select().from(schema.ingestionRuns).orderBy(desc(schema.ingestionRuns.startedAt)).limit(25),
    db.select().from(schema.alerts).where(isNull(schema.alerts.resolvedAt)).orderBy(desc(schema.alerts.createdAt)).limit(20),
    db.select({ status: j.status, isDemo: j.isDemo, n: count() }).from(j).groupBy(j.status, j.isDemo),
    db.select({ n: count() }).from(j).where(and(eq(j.isDemo, false), eq(j.status, "ACTIVE"), gte(j.firstSeenAt, day))),
    db.select().from(schema.coaches).where(eq(schema.coaches.status, "PENDING")),
    db.select().from(schema.coaches).where(eq(schema.coaches.status, "APPROVED")).limit(50),
    db.select().from(schema.articles).orderBy(desc(schema.articles.createdAt)).limit(30),
    db.select({ event: schema.usageDaily.event, n: sql<number>`sum(${schema.usageDaily.count})::int` }).from(schema.usageDaily).where(gte(schema.usageDaily.day, new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10))).groupBy(schema.usageDaily.event).orderBy(desc(sql`sum(${schema.usageDaily.count})`)),
    db.select({ n: count() }).from(schema.users),
    db.select({ d: sql<number>`coalesce(sum(${schema.ingestionRuns.duplicates}),0)::int`, r: sql<number>`coalesce(sum(${schema.ingestionRuns.rejected}),0)::int` }).from(schema.ingestionRuns).where(gte(schema.ingestionRuns.startedAt, day)),
  ]);
  const n = (s: string, demo = false) => byStatus.find((x) => x.status === s && x.isDemo === demo)?.n ?? 0;
  const live = n("ACTIVE");

  return (
    <>
      <PageHeader kicker="Admin" title="Operations dashboard" subtitle="Feed freshness, source permissions, ingestion health, moderation, and aggregate usage. No individual user data is shown here." actions={<RunIngest label="Run all sources" />} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Live active jobs" value={live} hint="Demo excluded" />
        <Stat label="New (24h)" value={newToday.n} hint={newToday.n < DAILY_TARGET ? `Below ${DAILY_TARGET} target` : "Target met"} />
        <Stat label="Stale / unavailable" value={`${n("STALE")} / ${n("UNAVAILABLE")}`} hint={`${n("EXPIRED")} expired`} />
        <Stat label="Dedup · rejected (24h)" value={`${dupes[0]?.d ?? 0} · ${dupes[0]?.r ?? 0}`} />
        <Stat label="Accounts" value={users.n} hint={`${byStatus.filter((x) => x.isDemo).reduce((s, x) => s + x.n, 0)} demo jobs in DB`} />
      </div>

      {alerts.length > 0 && <Card className="mt-6 border-amber-400/25"><h2 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle size={16} className="text-amber-300" />Open alerts</h2>
        <ul className="divide-y divide-white/5">{alerts.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span><span className={cx("chip mr-2", a.level === "critical" ? "chip-rose" : "chip-amber")}>{a.kind}</span>{a.message}<span className="ml-2 text-xs text-slate-500">{a.createdAt.toLocaleString()}</span></span><Resolve id={a.id} /></li>)}</ul></Card>}

      <Card className="mt-6 overflow-x-auto">
        <h2 className="mb-3 font-semibold">Sources & permissions</h2>
        <table className="w-full min-w-[900px] text-sm"><thead className="text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-2">Source</th><th>Authorization</th><th>Cadence</th><th>Attribution</th><th>Permitted fields</th><th>Last run / success</th><th /></tr></thead>
          <tbody>{sources.map((s) => { const a = ADAPTERS.find((x) => x.id === s.id); const cfg = s.configJson as { envVars?: string[]; termsUrl?: string; isDemo?: boolean }; return (
            <tr key={s.id} className="border-t border-white/5 align-top">
              <td className="py-3"><div className="flex items-center gap-2 font-medium">{s.enabled ? <span className="h-2 w-2 rounded-full bg-emerald-400" /> : <span className="h-2 w-2 rounded-full bg-slate-600" />}{s.name}{cfg.isDemo && <DemoBadge />}</div>
                {s.requiresApproval && <div className="mt-1 flex items-center gap-1 text-xs text-amber-200"><Lock size={11} />Partner approval required</div>}
                {!s.enabled && <div className="mt-1 text-xs text-slate-500">Needs: {cfg.envVars?.join(", ")}</div>}</td>
              <td className="py-3 text-xs text-slate-400">{s.authMethod}{cfg.termsUrl && <> · <a className="text-cyan-300 underline" href={cfg.termsUrl} target="_blank" rel="noreferrer">terms</a></>}</td>
              <td className="py-3 text-xs">{s.cadence}</td><td className="py-3 text-xs text-slate-400">{s.attribution}</td>
              <td className="max-w-[220px] py-3 text-[11px] text-slate-500">{s.permittedFields.join(", ") || "—"}</td>
              <td className="py-3 text-xs">{ago(s.lastRunAt)} / <span className={s.lastSuccessAt && Date.now() - s.lastSuccessAt.getTime() < 36 * 36e5 ? "text-emerald-300" : "text-amber-300"}>{ago(s.lastSuccessAt)}</span></td>
              <td className="py-3">{a && <RunIngest sourceId={s.id} />}</td>
            </tr>); })}</tbody></table>
        {sources.length === 0 && <p className="text-sm text-slate-400">Run ingestion once to register sources.</p>}
      </Card>

      <Card className="mt-6 overflow-x-auto">
        <h2 className="mb-3 font-semibold">Recent ingestion runs (audit log)</h2>
        <table className="w-full min-w-[800px] text-sm"><thead className="text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-2">When</th><th>Source</th><th>Status</th><th>Tries</th><th>Fetched</th><th>New</th><th>Updated</th><th>Dupes</th><th>Rejected</th><th>Unavail.</th><th>Notes</th></tr></thead>
          <tbody>{runs.map((r) => <tr key={r.id} className={cx("border-t border-white/5", r.status === "FAILED" && "bg-rose-500/[0.04]")}>
            <td className="py-2 text-xs text-slate-400">{r.startedAt.toLocaleString()}</td><td>{r.sourceId}</td><td><span className="flex items-center gap-1">{statusIcon(r.status)}{r.status}</span></td>
            <td>{r.attempts}</td><td>{r.fetched}</td><td>{r.inserted}</td><td>{r.updated}</td><td>{r.duplicates}</td><td>{r.rejected}</td><td>{r.markedStale}</td>
            <td className="max-w-[260px] truncate text-xs text-slate-500" title={r.error ?? ""}>{r.error?.split("\n")[0]}</td></tr>)}</tbody></table>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Coach listings: pending review ({pendingCoaches.length})</h2>
          {pendingCoaches.length === 0 ? <p className="text-sm text-slate-400">Queue is empty.</p> : <ul className="space-y-3">{pendingCoaches.map((c) => (
            <li key={c.id} className="rounded-xl border border-white/[0.06] p-3 text-sm"><div className="flex items-start justify-between gap-2"><div><b>{c.name}</b> <span className="text-slate-400">· {c.headline}</span></div><Moderate kind="coaches" id={c.id} /></div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{c.bio}</p><a href={c.bookingUrl} className="text-xs text-cyan-300 underline" target="_blank" rel="noreferrer">{c.bookingUrl}</a>
              <ul className="mt-2 space-y-1">{c.credentials.map((cr, i) => <li key={i} className="flex items-center gap-2 text-xs">{cr.name}: {cr.issuer} {cr.verifyUrl && <a href={cr.verifyUrl} className="text-slate-400 underline" target="_blank" rel="noreferrer">check</a>}<VerifyCredential id={c.id} index={i} verified={cr.verified} /></li>)}</ul></li>))}</ul>}
          {coaches.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm text-slate-400">Approved coaches ({coaches.length}): manage credential verification</summary>
            <ul className="mt-2 space-y-2">{coaches.map((c) => <li key={c.id} className="text-xs"><b>{c.name}</b> {c.isDemo && <DemoBadge />}{c.credentials.map((cr, i) => <span key={i} className="ml-2">{cr.name} <VerifyCredential id={c.id} index={i} verified={cr.verified} /></span>)}</li>)}</ul></details>}
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Articles</h2><NewArticle /></div>
          <ul className="divide-y divide-white/5">{articles.map((a) => <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm"><span>{a.title} {a.isDemo && <DemoBadge />} <span className={cx("chip ml-1", a.status === "APPROVED" ? "chip-green" : a.status === "REJECTED" ? "chip-rose" : "chip-amber")}>{a.status}</span></span>{a.status === "PENDING" && <Moderate kind="articles" id={a.id} />}</li>)}</ul>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-1 font-semibold">Aggregated product usage (last 14 days)</h2><p className="mb-3 text-xs text-slate-500">Counts only. No user identifiers are recorded for analytics.</p>
        {usage.length ? <PipelineChart data={usage.slice(0, 12).map((u) => ({ status: u.event.replace(/_/g, " "), count: u.n }))} /> : <p className="text-sm text-slate-400">No usage yet.</p>}
      </Card>
    </>
  );
}
