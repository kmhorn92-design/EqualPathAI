"use client";
import { useState } from "react";
import { Plus, Trash2, ExternalLink, Lightbulb, Loader2, X, CalendarClock, Copy } from "lucide-react";
import { followUp } from "@/lib/followups";
import { Empty, ErrorBox, cx } from "../ui";

export type App = { id: string; company: string; title: string; url: string | null; status: string; notes: string | null; appliedAt: string | null; reminderAt: string | null; resumeVersionId: string | null; updatedAt: string; createdAt: string };
const STATUSES = ["SAVED", "PREPARING", "APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "REJECTED", "WITHDRAWN"] as const;
const label = (s: string) => s[0] + s.slice(1).toLowerCase();
const COLORS: Record<string, string> = { SAVED: "bg-slate-400", PREPARING: "bg-violet-400", APPLIED: "bg-cyan-400", SCREENING: "bg-sky-400", INTERVIEWING: "bg-fuchsia-400", OFFER: "bg-emerald-400", REJECTED: "bg-rose-400", WITHDRAWN: "bg-slate-600" };
const toLocal = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export function Tracker({ initial, versions }: { initial: App[]; versions: { id: string; label: string }[] }) {
  const [apps, setApps] = useState(initial);
  const [open, setOpen] = useState<App | null>(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");

  async function patch(id: string, p: Partial<App>) {
    setApps((as) => as.map((a) => (a.id === id ? { ...a, ...p, updatedAt: new Date().toISOString() } : a)));
    const body = { ...p, ...(p.reminderAt !== undefined ? { reminderAt: p.reminderAt ? new Date(p.reminderAt).toISOString() : "" } : {}), ...(p.appliedAt !== undefined ? { appliedAt: p.appliedAt ? new Date(p.appliedAt).toISOString() : "" } : {}) };
    const r = await fetch(`/api/applications/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) setErr((await r.json().catch(() => ({}))).error ?? "Update failed");
  }
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr(null);
    const f = new FormData(e.currentTarget);
    const payload = { company: f.get("company"), title: f.get("title"), url: f.get("url") || "", status: f.get("status"), notes: f.get("notes") || null };
    const r = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) return setErr(d.error ?? "Could not add");
    const now = new Date().toISOString();
    setApps((as) => [{ id: d.id, company: String(payload.company), title: String(payload.title), url: (payload.url as string) || null, status: String(payload.status), notes: (payload.notes as string) ?? null, appliedAt: payload.status === "APPLIED" ? now : null, reminderAt: null, resumeVersionId: null, updatedAt: now, createdAt: now }, ...as]);
    setAdding(false);
  }
  async function remove(id: string) {
    if (!confirm("Remove this application?")) return;
    await fetch(`/api/applications/${id}`, { method: "DELETE" }); setApps((as) => as.filter((a) => a.id !== id)); setOpen(null);
  }

  const cols = STATUSES.filter((s) => s !== "WITHDRAWN");
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="glass inline-flex p-1">{(["board", "list"] as const).map((v) => <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cx("rounded-lg px-3 py-1.5 text-sm", view === v ? "bg-white/10" : "text-slate-400")}>{label(v.toUpperCase())}</button>)}</div>
        <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} />Add application</button>
      </div>
      {err && <div className="mb-3"><ErrorBox>{err}</ErrorBox></div>}
      {adding && (
        <form onSubmit={add} className="glass mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <input name="company" required className="input" placeholder="Company" aria-label="Company" />
          <input name="title" required className="input" placeholder="Job title" aria-label="Job title" />
          <input name="url" type="url" className="input" placeholder="Posting URL (optional)" aria-label="Posting URL" />
          <select name="status" className="input" aria-label="Status" defaultValue="APPLIED">{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
          <div className="flex gap-2"><button className="btn-primary flex-1" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Add"}</button><button type="button" className="btn-ghost" onClick={() => setAdding(false)} aria-label="Cancel"><X size={16} /></button></div>
        </form>
      )}
      {apps.length === 0 ? <Empty title="Nothing tracked yet" body="Add applications here, or press “Track” on any job in the Job Board." /> : view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-3">{cols.map((s) => {
          const list = apps.filter((a) => a.status === s);
          return (
            <section key={s} className="w-64 shrink-0" aria-label={label(s)}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) patch(id, { status: s }); }}>
              <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400"><span className={cx("h-2 w-2 rounded-full", COLORS[s])} />{label(s)} <span className="text-slate-600">{list.length}</span></h3>
              <div className="min-h-[120px] space-y-2 rounded-2xl border border-white/[0.05] bg-white/[0.015] p-2">
                {list.map((a) => (
                  <button key={a.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)} onClick={() => setOpen(a)} className="glass glass-hover block w-full cursor-grab p-3 text-left">
                    <div className="text-sm font-medium">{a.title}</div><div className="text-xs text-slate-400">{a.company}</div>
                    {a.reminderAt && <div className="mt-1.5 flex items-center gap-1 text-[11px] text-cyan-300"><CalendarClock size={11} />{new Date(a.reminderAt).toLocaleDateString()}</div>}
                  </button>))}
              </div>
            </section>);
        })}</div>
      ) : (
        <div className="glass overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">Role</th><th className="p-3">Company</th><th className="p-3">Status</th><th className="p-3">Applied</th><th className="p-3">Reminder</th></tr></thead>
          <tbody>{apps.map((a) => <tr key={a.id} className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]" onClick={() => setOpen(a)}><td className="p-3">{a.title}</td><td className="p-3 text-slate-400">{a.company}</td><td className="p-3"><span className="chip">{label(a.status)}</span></td><td className="p-3 text-slate-400">{a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : "—"}</td><td className="p-3 text-slate-400">{a.reminderAt ? new Date(a.reminderAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>
      )}

      {open && (() => { const a = apps.find((x) => x.id === open.id) ?? open; const fu = followUp(a); return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label={`${a.title} details`}>
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-ink-800 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold">{a.title}</h2><p className="text-slate-400">{a.company}</p></div><button onClick={() => setOpen(null)} className="p-2 text-slate-400" aria-label="Close"><X size={18} /></button></div>
            {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-300">View posting<ExternalLink size={12} /></a>}
            <div className="mt-5 space-y-4">
              <div><label className="label" htmlFor="st">Status</label><select id="st" className="input" value={a.status} onChange={(e) => patch(a.id, { status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label" htmlFor="ad">Applied on</label><input id="ad" type="date" className="input" value={toLocal(a.appliedAt)} onChange={(e) => patch(a.id, { appliedAt: e.target.value || null })} /></div>
                <div><label className="label" htmlFor="rm">Reminder</label><input id="rm" type="date" className="input" value={toLocal(a.reminderAt)} onChange={(e) => patch(a.id, { reminderAt: e.target.value || null })} /></div>
              </div>
              <div><label className="label" htmlFor="rv">Resume version used</label><select id="rv" className="input" value={a.resumeVersionId ?? ""} onChange={(e) => patch(a.id, { resumeVersionId: e.target.value || null })}><option value="">—</option>{versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></div>
              <div><label className="label" htmlFor="nt">Notes (encrypted)</label><textarea id="nt" className="input min-h-[120px]" defaultValue={a.notes ?? ""} onBlur={(e) => e.target.value !== (a.notes ?? "") && patch(a.id, { notes: e.target.value })} placeholder="Contacts, interview dates, questions to ask…" /></div>
              {fu && <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.07] p-4 text-sm">
                <div className="flex items-start gap-2"><Lightbulb size={16} className="mt-0.5 shrink-0 text-violet-300" /><p>{fu.tip}</p></div>
                {fu.draft && <><pre className="mt-3 whitespace-pre-wrap rounded-lg bg-ink-900/70 p-3 font-sans text-xs text-slate-300">{fu.draft}</pre><button className="btn-ghost mt-2 py-1.5 text-xs" onClick={() => navigator.clipboard.writeText(fu.draft!)}><Copy size={12} />Copy draft</button></>}
              </div>}
              <button className="btn-danger w-full" onClick={() => remove(a.id)}><Trash2 size={15} />Remove</button>
            </div>
          </div>
        </div>); })()}
    </div>
  );
}
