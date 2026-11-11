"use client";
import { useState } from "react";
import { CalendarPlus, Video, Phone, MapPin, X, Loader2, ExternalLink, Clock, Check } from "lucide-react";
import { cx, Empty, ErrorBox } from "../ui";

export type Sess = { id: string; status: string; sessionName: string; format: string; startsAt: string; endsAt: string; arrangement: string | null; meetingUrl: string | null; coachNote: string | null; goal: string | null; accessibility: string | null; resumeShared: boolean; coachName: string };

export const STATUS_STYLE: Record<string, string> = { REQUESTED: "chip-amber", CONFIRMED: "chip-green", DECLINED: "chip-rose", CANCELLED: "chip", COMPLETED: "chip-violet" };
export const STATUS_LABEL: Record<string, string> = { REQUESTED: "Awaiting coach", CONFIRMED: "Confirmed", DECLINED: "Declined", CANCELLED: "Cancelled", COMPLETED: "Completed" };
export const FORMAT_ICON: Record<string, typeof Video> = { video: Video, phone: Phone, "in-person": MapPin };
export const ARR_LABEL: Record<string, string> = { REMOTE: "Remote", HYBRID: "Hybrid", ONSITE: "On-site" };
export const when = (s: string, e: string) => `${new Date(s).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} – ${new Date(e).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`;

export function SessionList({ initial }: { initial: Sess[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const now = Date.now();
  const upcoming = items.filter((s) => new Date(s.endsAt).getTime() > now && ["REQUESTED", "CONFIRMED"].includes(s.status));
  const past = items.filter((s) => !upcoming.includes(s));

  async function cancel(id: string) {
    setBusy(id); setErr(null);
    const r = await fetch(`/api/bookings/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
    setBusy(null); setConfirming(null);
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Couldn't cancel");
    setItems((x) => x.map((s) => (s.id === id ? { ...s, status: "CANCELLED" } : s)));
  }

  const Row = ({ s }: { s: Sess }) => { const I = FORMAT_ICON[s.format] ?? Video; return (
    <li className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{s.sessionName} with {s.coachName}</h3><span className={STATUS_STYLE[s.status]}>{STATUS_LABEL[s.status]}</span></div>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-400"><span className="flex items-center gap-1"><Clock size={13} />{when(s.startsAt, s.endsAt)}</span><span className="flex items-center gap-1"><I size={13} />{s.format}</span>{s.arrangement && <span className="chip-cyan">{ARR_LABEL[s.arrangement]} search</span>}</p></div>
        <div className="flex flex-wrap gap-2">
          {s.status === "CONFIRMED" && s.meetingUrl && <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary py-1.5 text-xs">Join<ExternalLink size={12} /></a>}
          {s.status === "CONFIRMED" && <a href={`/api/bookings/${s.id}/ics`} className="btn-ghost py-1.5 text-xs"><CalendarPlus size={13} />Add to calendar</a>}
          {["REQUESTED", "CONFIRMED"].includes(s.status) && (confirming === s.id
            ? <span className="flex items-center gap-1.5 text-xs">Cancel this session?<button className="btn-danger py-1.5 text-xs" disabled={busy === s.id} onClick={() => cancel(s.id)}>{busy === s.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}Yes</button><button className="btn-ghost py-1.5 text-xs" onClick={() => setConfirming(null)}>No</button></span>
            : <button className="btn-ghost py-1.5 text-xs" onClick={() => setConfirming(s.id)}><X size={13} />Cancel</button>)}
        </div>
      </div>
      {(s.goal || s.coachNote) && <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        {s.goal && <p className="rounded-lg bg-white/[0.03] p-3 text-slate-300"><span className="block text-[11px] uppercase tracking-wider text-slate-500">Your goal</span>{s.goal}</p>}
        {s.coachNote && <p className="rounded-lg bg-violet-500/[0.08] p-3 text-violet-50"><span className="block text-[11px] uppercase tracking-wider text-violet-300">Note from {s.coachName}</span>{s.coachNote}</p>}</div>}
      {s.resumeShared && ["REQUESTED", "CONFIRMED"].includes(s.status) && <p className="mt-2 text-xs text-slate-500">You shared a resume version with this coach for this session.</p>}
    </li>); };

  return (
    <div className="space-y-8">
      {err && <ErrorBox>{err}</ErrorBox>}
      <section><h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
        {upcoming.length ? <ul className="space-y-3">{upcoming.map((s) => <Row key={s.id} s={s} />)}</ul> : <Empty title="No upcoming sessions" body="Find a coach who focuses on remote, hybrid or on-site job searches." action={<a href="/coaches" className="btn-primary">Browse coaches</a>} />}</section>
      {past.length > 0 && <section><h2 className={cx("mb-3 text-lg font-semibold text-slate-300")}>Past & closed</h2><ul className="space-y-3 opacity-80">{past.map((s) => <Row key={s.id} s={s} />)}</ul></section>}
    </div>
  );
}
