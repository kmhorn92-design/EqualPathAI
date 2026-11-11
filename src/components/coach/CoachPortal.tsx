"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Loader2, Check, X, CalendarPlus, ExternalLink, FileText, Clock, Copy, Globe, Shuffle, Building2, Accessibility } from "lucide-react";
import type { ResumeData } from "@/lib/resume/types";
import { ResumePreview } from "../resume/ResumePreview";
import { Card, cx, Empty, ErrorBox, Notice } from "../ui";
import { Portal } from "../ui/Portal";
import { ARR_LABEL, FORMAT_ICON, STATUS_LABEL, STATUS_STYLE, when } from "./SessionList";

type Win = { weekday: number; startMinute: number; endMinute: number };
type Settings = { focus: string[]; formats: string[]; timezone: string; bookingEnabled: boolean };
export type CoachSess = { id: string; status: string; sessionName: string; format: string; startsAt: string; endsAt: string; arrangement: string | null; meetingUrl: string | null; coachNote: string | null; goal: string | null; accessibility: string | null; resumeShared: boolean; clientName: string; clientTimezone: string | null };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES = Array.from({ length: 49 }, (_, i) => i * 30);
const label = (m: number) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return m === 1440 ? "12:00 AM (end)" : `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const ZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "America/Puerto_Rico", "Europe/London", "Asia/Kolkata"];
const ARR = [["REMOTE", "Remote", Globe], ["HYBRID", "Hybrid", Shuffle], ["ONSITE", "On-site", Building2]] as const;

export function CoachPortal({ coachName, approved, initialSettings, initialWindows, sessions }: { coachName: string; approved: boolean; initialSettings: Settings; initialWindows: Win[]; sessions: CoachSess[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"requests" | "availability">(sessions.some((s) => s.status === "REQUESTED") || initialWindows.length ? "requests" : "availability");
  const [settings, setSettings] = useState(initialSettings);
  const [wins, setWins] = useState<Win[]>(initialWindows);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState(sessions);

  async function save() {
    setSaving(true); setErr(null); setSaved(false);
    const r = await fetch("/api/coach-portal", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...settings, windows: wins }) });
    const d = await r.json().catch(() => ({})); setSaving(false);
    if (!r.ok) return setErr(d.issues ? Object.values(d.issues).flat().join(" ") : d.error ?? "Save failed");
    setWins(d.windows); setSaved(true); router.refresh();
  }
  const toggle = (k: "focus" | "formats", v: string) => setSettings((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const pending = items.filter((s) => s.status === "REQUESTED");
  const upcoming = items.filter((s) => s.status === "CONFIRMED");
  const past = items.filter((s) => !["REQUESTED", "CONFIRMED"].includes(s.status));

  return (
    <div>
      {!approved && <div className="mb-5"><Notice tone="amber">Your listing is waiting for admin review. You can set availability now, and clients will be able to book once it&apos;s approved and booking is on.</Notice></div>}
      <div role="tablist" className="glass mb-6 inline-flex gap-1 p-1">
        {([["requests", `Sessions${pending.length ? ` (${pending.length} new)` : ""}`], ["availability", "Availability & settings"]] as const).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx("rounded-lg px-4 py-2 text-sm font-medium", tab === id ? "bg-white/10 text-white" : "text-slate-400 hover:text-white")}>{l}</button>))}
      </div>

      {tab === "requests" && <div className="space-y-8">
        <section><h2 className="mb-3 text-lg font-semibold">Requests needing a response</h2>
          {pending.length ? <ul className="space-y-3">{pending.map((s) => <SessionCard key={s.id} s={s} onChange={(n) => setItems((x) => x.map((y) => (y.id === s.id ? { ...y, ...n } : y)))} />)}</ul>
            : <Empty title="No pending requests" body={settings.bookingEnabled ? "New requests will appear here, and you'll get a notification." : "Turn on booking under Availability & settings so clients can request sessions."} />}</section>
        <section><h2 className="mb-3 text-lg font-semibold">Confirmed</h2>
          {upcoming.length ? <ul className="space-y-3">{upcoming.map((s) => <SessionCard key={s.id} s={s} onChange={(n) => setItems((x) => x.map((y) => (y.id === s.id ? { ...y, ...n } : y)))} />)}</ul> : <p className="text-sm text-slate-400">No confirmed sessions yet.</p>}</section>
        {past.length > 0 && <section><h2 className="mb-3 text-lg font-semibold text-slate-300">Past & closed</h2><ul className="space-y-3 opacity-80">{past.map((s) => <SessionCard key={s.id} s={s} onChange={() => {}} />)}</ul></section>}
      </div>}

      {tab === "availability" && <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <h2 className="mb-4 font-semibold">Booking settings</h2>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 p-3">
            <span><span className="block text-sm font-medium">Accept bookings in EqualPath</span><span className="text-xs text-slate-400">Clients can request open times from your availability.</span></span>
            <input type="checkbox" className="h-5 w-5 accent-violet-500" checked={settings.bookingEnabled} onChange={(e) => setSettings({ ...settings, bookingEnabled: e.target.checked })} />
          </label>
          <fieldset className="mt-4"><legend className="label">I help with job searches for…</legend><div className="flex flex-wrap gap-2">{ARR.map(([v, l, I]) => (
            <button key={v} type="button" aria-pressed={settings.focus.includes(v)} onClick={() => toggle("focus", v)} className={cx("btn-ghost py-2 text-xs", settings.focus.includes(v) && "border-cyan-400/50 bg-cyan-500/15 text-white")}><I size={14} />{l}</button>))}</div></fieldset>
          <fieldset className="mt-4"><legend className="label">Session formats</legend><div className="flex flex-wrap gap-2">{(["video", "phone", "in-person"] as const).map((f) => { const I = FORMAT_ICON[f]; return (
            <button key={f} type="button" aria-pressed={settings.formats.includes(f)} onClick={() => toggle("formats", f)} className={cx("btn-ghost py-2 text-xs capitalize", settings.formats.includes(f) && "border-cyan-400/50 bg-cyan-500/15 text-white")}><I size={14} />{f}</button>); })}</div></fieldset>
          <div className="mt-4"><label htmlFor="tz" className="label">Your time zone</label>
            <select id="tz" className="input" value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>{[...new Set([settings.timezone, ...ZONES])].map((z) => <option key={z}>{z}</option>)}</select>
            <p className="mt-1 text-xs text-slate-500">Your availability uses this zone. Clients see times converted to their own.</p></div>
        </Card>
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Weekly availability</h2>
            <button className="btn-ghost py-1.5 text-xs" onClick={() => { const mon = wins.filter((w) => w.weekday === 1); if (mon.length) setWins([...wins.filter((w) => w.weekday < 1 || w.weekday > 5), ...[1, 2, 3, 4, 5].flatMap((d) => mon.map((w) => ({ ...w, weekday: d })))]); }}><Copy size={13} />Copy Monday to weekdays</button></div>
          <div className="space-y-3">{DAYS.map((d, wd) => {
            const day = wins.map((w, i) => ({ w, i })).filter((x) => x.w.weekday === wd);
            return (
              <div key={d} className="flex flex-wrap items-start gap-3 border-b border-white/5 pb-3 last:border-0">
                <div className="w-24 pt-2 text-sm font-medium">{d.slice(0, 3)}</div>
                <div className="flex-1 space-y-2">
                  {day.length === 0 && <p className="pt-2 text-sm text-slate-500">Unavailable</p>}
                  {day.map(({ w, i }) => (
                    <div key={i} className="flex items-center gap-2">
                      <select aria-label={`${d} start`} className="input py-1.5" value={w.startMinute} onChange={(e) => setWins(wins.map((x, j) => (j === i ? { ...x, startMinute: +e.target.value } : x)))}>{TIMES.slice(0, -1).map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
                      <span className="text-slate-500">–</span>
                      <select aria-label={`${d} end`} className="input py-1.5" value={w.endMinute} onChange={(e) => setWins(wins.map((x, j) => (j === i ? { ...x, endMinute: +e.target.value } : x)))}>{TIMES.slice(1).map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
                      <button className="p-2 text-slate-500 hover:text-rose-300" aria-label={`Remove ${d} window`} onClick={() => setWins(wins.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
                    </div>))}
                </div>
                <button className="btn-ghost py-1.5 text-xs" onClick={() => setWins([...wins, { weekday: wd, startMinute: 540, endMinute: 720 }])} aria-label={`Add ${d} window`}><Plus size={13} />Add</button>
              </div>);
          })}</div>
        </Card>
        <div className="flex items-center gap-3 lg:col-span-2">
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Save availability & settings</button>
          {saved && <span className="text-sm text-emerald-300" role="status">Saved.</span>}
        </div>
        {err && <div className="lg:col-span-2"><ErrorBox>{err}</ErrorBox></div>}
      </div>}
      <p className="mt-8 text-xs text-slate-500">Signed in as coach: {coachName}. Client email addresses are never shown here. Share your meeting link through EqualPath, and keep client information confidential.</p>
    </div>
  );
}

function SessionCard({ s, onChange }: { s: CoachSess; onChange: (n: Partial<CoachSess>) => void }) {
  const [mode, setMode] = useState<null | "confirm" | "decline" | "cancel" | "complete">(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resume, setResume] = useState<{ label: string; templateId: string; content: ResumeData } | null>(null);
  const I = FORMAT_ICON[s.format];
  const started = new Date(s.startsAt).getTime() <= Date.now();

  async function act(action: string) {
    setBusy(true); setErr(null);
    const r = await fetch(`/api/bookings/${s.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, meetingUrl: url, note: note || undefined }) });
    const d = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) return setErr(d.issues ? Object.values(d.issues).flat().join(" ") : d.error ?? "Failed");
    const status = { confirm: "CONFIRMED", decline: "DECLINED", cancel: "CANCELLED", complete: "COMPLETED" }[action]!;
    onChange({ status, meetingUrl: action === "confirm" ? url || null : s.meetingUrl, coachNote: note || s.coachNote }); setMode(null);
  }
  async function viewResume() {
    const r = await fetch(`/api/bookings/${s.id}/resume`); const d = await r.json().catch(() => ({}));
    if (r.ok) setResume(d); else setErr(d.error ?? "Couldn't open resume");
  }

  return (
    <li className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{s.sessionName}: {s.clientName}</h3><span className={STATUS_STYLE[s.status]}>{s.status === "REQUESTED" ? "New request" : STATUS_LABEL[s.status]}</span></div>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-400"><span className="flex items-center gap-1"><Clock size={13} />{when(s.startsAt, s.endsAt)}</span>{I && <span className="flex items-center gap-1 capitalize"><I size={13} />{s.format}</span>}
            {s.arrangement && <span className="chip-cyan">{ARR_LABEL[s.arrangement]} search</span>}{s.clientTimezone && <span className="text-xs">Client zone: {s.clientTimezone}</span>}</p></div>
        <div className="flex flex-wrap gap-2">
          {s.resumeShared && ["REQUESTED", "CONFIRMED"].includes(s.status) && <button className="btn-ghost py-1.5 text-xs" onClick={viewResume}><FileText size={13} />Shared resume</button>}
          {s.status === "REQUESTED" && !mode && <><button className="btn-primary py-1.5 text-xs" onClick={() => setMode("confirm")}><Check size={13} />Confirm</button><button className="btn-ghost py-1.5 text-xs" onClick={() => setMode("decline")}><X size={13} />Decline</button></>}
          {s.status === "CONFIRMED" && !mode && <>
            {s.meetingUrl && <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary py-1.5 text-xs">Join<ExternalLink size={12} /></a>}
            <a href={`/api/bookings/${s.id}/ics`} className="btn-ghost py-1.5 text-xs"><CalendarPlus size={13} />Calendar</a>
            {started ? <button className="btn-ghost py-1.5 text-xs" onClick={() => setMode("complete")}><Check size={13} />Mark complete</button> : <button className="btn-ghost py-1.5 text-xs" onClick={() => setMode("cancel")}><X size={13} />Cancel</button>}
          </>}
        </div>
      </div>
      {(s.goal || s.accessibility) && <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        {s.goal && <p className="rounded-lg bg-white/[0.03] p-3 text-slate-300"><span className="block text-[11px] uppercase tracking-wider text-slate-500">Client&apos;s goal</span>{s.goal}</p>}
        {s.accessibility && <p className="rounded-lg bg-cyan-500/[0.06] p-3 text-cyan-50"><span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-cyan-300"><Accessibility size={12} />Accessibility needs</span>{s.accessibility}</p>}</div>}
      {mode && <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-ink-900/50 p-4">
        {mode === "confirm" && <div><label htmlFor={`u-${s.id}`} className="label">{s.format === "video" ? "Video meeting link (required)" : "Meeting details link (optional)"}</label><input id={`u-${s.id}`} className="input" type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} /></div>}
        <div><label htmlFor={`n-${s.id}`} className="label">{mode === "decline" ? "Note to the client (optional; suggest another time?)" : mode === "complete" ? "Follow-up note (optional)" : "Note to the client (optional)"}</label><textarea id={`n-${s.id}`} className="input min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <div className="flex gap-2"><button className={mode === "decline" || mode === "cancel" ? "btn-danger" : "btn-primary"} disabled={busy} onClick={() => act(mode)}>{busy && <Loader2 size={14} className="animate-spin" />}{{ confirm: "Confirm session", decline: "Decline request", cancel: "Cancel session", complete: "Mark complete" }[mode]}</button><button className="btn-ghost" onClick={() => setMode(null)}>Back</button></div>
      </div>}
      {err && <div className="mt-3"><ErrorBox>{err}</ErrorBox></div>}
      {resume && <Portal><div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Shared resume" onClick={() => setResume(null)}>
        <div className="mx-auto max-w-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between text-sm"><span>Shared by {s.clientName}: <b>{resume.label}</b> <span className="text-slate-400">(read-only, confidential)</span></span><button className="btn-ghost py-1.5 text-xs" onClick={() => setResume(null)}><X size={13} />Close</button></div>
          <ResumePreview data={resume.content} templateId={resume.templateId} />
        </div></div></Portal>}
    </li>
  );
}
