"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Check, X, ArrowLeft, ArrowRight, Loader2, Video, Phone, MapPin, Globe, Shuffle, Building2, Clock, Lock } from "lucide-react";
import { SESSION_TYPES, type SessionType, type Format } from "@/lib/booking";
import { cx, ErrorBox } from "../ui";
import { Portal } from "../ui/Portal";

type Coach = { id: string; name: string; headline: string; formats: string[]; location: string | null; priceFrom: number | null; focus: string[] };
const ARR = [["REMOTE", "Remote", Globe], ["HYBRID", "Hybrid", Shuffle], ["ONSITE", "On-site", Building2]] as const;
const FMT: Record<string, [string, typeof Video]> = { video: ["Video", Video], phone: ["Phone", Phone], "in-person": ["In person", MapPin] };

export function BookCoach({ coach, versions, signedIn }: { coach: Coach; versions: { id: string; label: string }[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  if (!signedIn) return <Link href="/login" className="btn-primary py-1.5 text-xs"><Calendar size={13} />Sign in to book</Link>;
  return (<>
    <button className="btn-primary py-1.5 text-xs" onClick={() => setOpen(true)}><Calendar size={13} />Book a session</button>
    {open && <Portal><Dialog coach={coach} versions={versions} onClose={() => setOpen(false)} /></Portal>}
  </>);
}

function Dialog({ coach, versions, onClose }: { coach: Coach; versions: { id: string; label: string }[]; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<SessionType>("intro");
  const [format, setFormat] = useState<Format>(coach.formats[0] as Format);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [arrangement, setArrangement] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [access, setAccess] = useState("");
  const [share, setShare] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (step !== 1) return;
    setSlots(null); setSlot(null); setErr(null);
    fetch(`/api/coaches/${coach.id}/slots?session=${type}`).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setSlots(d.slots); })
      .catch((e) => setErr(e.message ?? "Couldn't load availability."));
  }, [step, type, coach.id]);

  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of slots ?? []) { const k = new Date(s).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); m.set(k, [...(m.get(k) ?? []), s]); }
    return m;
  }, [slots]);
  useEffect(() => { if (byDay.size && (!day || !byDay.has(day))) setDay([...byDay.keys()][0]); }, [byDay, day]);

  async function submit() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ coachId: coach.id, sessionType: type, format, startsAt: slot, arrangement: arrangement || null, goal: goal || null, accessibility: access || null, sharedResumeVersionId: share || null, clientTimezone: tz }) });
    const d = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(d.error ?? "Booking failed"); if (r.status === 409) { setStep(1); } return; }
    setDone(true);
  }
  const t = SESSION_TYPES[type];
  const fmtSlot = (s: string) => new Date(s).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Book a session with ${coach.name}`} onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-800 p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Book with {coach.name}</h2><p className="text-sm text-slate-400">{coach.headline}</p></div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Close"><X size={18} /></button></div>

        {done ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500"><Check size={30} /></div>
            <h3 className="text-2xl font-semibold">Request sent</h3>
            <p className="mt-2 text-slate-300">{t.name} · {new Date(slot!).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">{coach.name} will confirm or suggest another time. You&apos;ll get a notification, and you can track it in My Sessions.</p>
            <div className="mt-6 flex justify-center gap-2"><Link href="/sessions" className="btn-primary">Go to My Sessions</Link><button className="btn-ghost" onClick={onClose}>Close</button></div>
          </div>
        ) : (<>
          <ol className="mt-5 flex gap-2 text-xs">{["Session", "Time", "Your goals", "Review"].map((l, i) => (
            <li key={l} className={cx("flex-1 rounded-full px-2 py-1 text-center", i === step ? "bg-violet-500/25 text-white" : i < step ? "bg-emerald-500/15 text-emerald-200" : "bg-white/5 text-slate-500")}>{l}</li>))}</ol>
          {err && <div className="mt-4"><ErrorBox>{err}</ErrorBox></div>}

          {step === 0 && <div className="mt-5 space-y-5">
            <fieldset><legend className="label">Session type</legend><div className="grid gap-2 sm:grid-cols-2">{(Object.keys(SESSION_TYPES) as SessionType[]).map((k) => { const s = SESSION_TYPES[k]; return (
              <label key={k} className={cx("cursor-pointer rounded-xl border p-3 text-sm", type === k ? "border-violet-400/60 bg-violet-500/15" : "border-white/10 hover:border-white/25")}>
                <input type="radio" name="type" className="sr-only" checked={type === k} onChange={() => setType(k)} />
                <div className="flex justify-between font-medium"><span>{s.name}</span><span className="text-slate-400">{s.minutes} min</span></div>
                <div className="text-xs text-slate-400">{s.blurb}</div><div className="mt-1 text-xs text-emerald-300">{s.free || coach.priceFrom === 0 ? "Free" : coach.priceFrom ? `From $${coach.priceFrom}` : "Price set by coach"}</div>
              </label>); })}</div></fieldset>
            <fieldset><legend className="label">Format</legend><div className="flex flex-wrap gap-2">{coach.formats.map((f) => { const [l, I] = FMT[f] ?? [f, Video]; return (
              <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f as Format)} className={cx("btn-ghost py-2 text-xs", format === f && "border-cyan-400/50 bg-cyan-500/15 text-white")}><I size={14} />{l}{f === "in-person" && coach.location ? ` · ${coach.location}` : ""}</button>); })}</div></fieldset>
            {coach.priceFrom !== 0 && type !== "intro" && <p className="text-xs text-slate-500">Paid sessions are arranged and paid directly with the coach. EqualPath doesn&apos;t process payments.</p>}
          </div>}

          {step === 1 && <div className="mt-5">
            <p className="mb-3 text-xs text-slate-400">Times are shown in your time zone ({tz}).</p>
            {!slots && !err && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />Loading open times…</div>}
            {slots && slots.length === 0 && <p className="rounded-xl bg-white/[0.03] p-4 text-sm text-slate-300">No open times in the next three weeks for a {t.minutes}-minute session. Try a shorter session type or another coach.</p>}
            {byDay.size > 0 && <>
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{[...byDay.keys()].map((k) => (
                <button key={k} onClick={() => setDay(k)} aria-pressed={day === k} className={cx("shrink-0 rounded-xl border px-3 py-2 text-sm", day === k ? "border-violet-400/60 bg-violet-500/15" : "border-white/10 hover:border-white/25")}>{k}</button>))}</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{(byDay.get(day!) ?? []).map((s) => (
                <button key={s} onClick={() => setSlot(s)} aria-pressed={slot === s} className={cx("rounded-lg border px-2 py-2 text-sm", slot === s ? "border-cyan-400/60 bg-cyan-500/20 text-white" : "border-white/10 hover:border-white/25")}><Clock size={12} className="mr-1 inline text-slate-400" />{fmtSlot(s)}</button>))}</div>
            </>}
          </div>}

          {step === 2 && <div className="mt-5 space-y-4">
            <fieldset><legend className="label">I&apos;m looking for…</legend><div className="flex flex-wrap gap-2">{ARR.map(([id, l, I]) => (
              <button key={id} type="button" aria-pressed={arrangement === id} onClick={() => setArrangement(arrangement === id ? "" : id)} className={cx("btn-ghost py-2 text-xs", arrangement === id && "border-cyan-400/50 bg-cyan-500/15 text-white")}><I size={14} />{l} work</button>))}</div></fieldset>
            <div><label htmlFor="goal" className="label">What would you like help with? (optional)</label><textarea id="goal" className="input min-h-[90px]" maxLength={1500} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. I'm moving from retail into remote customer support and want to practice video interviews." /></div>
            <div><label htmlFor="acc" className="label">Accessibility needs (optional)</label><input id="acc" className="input" maxLength={500} value={access} onChange={(e) => setAccess(e.target.value)} placeholder="e.g. captions, ASL interpreter, extra time" /></div>
            <div><label htmlFor="share" className="label">Share a resume version with this coach? (optional)</label>
              <select id="share" className="input" value={share} onChange={(e) => setShare(e.target.value)}><option value="">Don&apos;t share a resume</option>{versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Lock size={11} />Only this coach can view the version you pick, and only while the session is active.</p></div>
          </div>}

          {step === 3 && slot && <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm">
            {[["Coach", coach.name], ["Session", `${t.name} (${t.minutes} min)`], ["When", new Date(slot).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })],
              ["Format", FMT[format]?.[0] ?? format], ["Looking for", arrangement ? ARR.find((a) => a[0] === arrangement)![1] + " work" : "Not specified"], ["Resume shared", share ? versions.find((v) => v.id === share)?.label ?? "Yes" : "No"],
              ...(access ? [["Accessibility", access]] : [])].map(([k, v]) => <div key={k} className="flex justify-between gap-4"><span className="text-slate-400">{k}</span><span className="text-right">{v}</span></div>)}
            <p className="pt-2 text-xs text-slate-500">This sends a request. The session is booked once {coach.name} confirms.</p>
          </div>}

          <div className="mt-6 flex justify-between">
            <button className="btn-ghost" onClick={() => (step ? setStep(step - 1) : onClose())}><ArrowLeft size={15} />{step ? "Back" : "Cancel"}</button>
            {step < 3 ? <button className="btn-primary" disabled={step === 1 && !slot} onClick={() => { setErr(null); setStep(step + 1); }}>Continue<ArrowRight size={15} /></button>
              : <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Send request</button>}
          </div>
        </>)}
      </div>
    </div>
  );
}
