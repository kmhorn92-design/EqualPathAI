/**
 * Career Coaches — demo section. All coaches are fictional and labeled DEMO.
 * Booking here is simulated in the browser; the full app links to each coach's own booking page.
 */
import { useMemo, useState } from "react";
import { Globe, Building2, Shuffle, Calendar, Clock, Check, X, Video, Phone, MapPin, ShieldQuestion, ArrowLeft, ArrowRight, Users, Languages, Trash2 } from "lucide-react";
import { cx, Notice, Card } from "@/components/ui";

export type Arrangement = "REMOTE" | "HYBRID" | "ONSITE";
type Coach = {
  id: string; name: string; headline: string; bio: string; focus: Arrangement[]; specialties: string[]; languages: string[];
  formats: ("video" | "phone" | "in-person")[]; location: string; price: number; credential: string; hue: string;
  helps: Record<Arrangement, string | undefined>;
};

export const COACHES: Coach[] = [
  { id: "c1", name: "Jordan Ellis", headline: "Landing your first fully remote role", focus: ["REMOTE"], specialties: ["Career change", "Resume review", "Remote job search"], languages: ["English", "Spanish"], formats: ["video", "phone"], location: "Remote", price: 0, credential: "Example Career Coaching Certificate", hue: "from-violet-500 to-fuchsia-500",
    bio: "Helps career changers spot legitimate remote listings, avoid work-from-home scams, and show they can work on their own on a resume.",
    helps: { REMOTE: "Spotting real remote roles vs. scams, async communication on your resume, home-office readiness questions.", HYBRID: undefined, ONSITE: undefined } },
  { id: "c2", name: "Priya Nair", headline: "Tech and data roles: remote and hybrid", focus: ["REMOTE", "HYBRID"], specialties: ["Tech careers", "Interview prep", "Students & new grads"], languages: ["English", "Hindi"], formats: ["video"], location: "Remote", price: 60, credential: "Example Technical Recruiting Credential", hue: "from-cyan-500 to-blue-500",
    bio: "A former recruiter who helps new grads and bootcamp grads understand how remote tech teams hire, from take-home tests to video interviews.",
    helps: { REMOTE: "Video-interview setup, take-home assignments, showing results in a distributed team.", HYBRID: "Negotiating in-office days and commute trade-offs.", ONSITE: undefined } },
  { id: "c3", name: "Marcus Webb", headline: "Hybrid office, government and federal jobs", focus: ["HYBRID", "ONSITE"], specialties: ["Federal jobs", "Returning to work", "Salary negotiation"], languages: ["English"], formats: ["video", "phone", "in-person"], location: "Baltimore, MD", price: 75, credential: "Example Workforce Development Certificate", hue: "from-amber-500 to-orange-500",
    bio: "Guides people returning to work through USAJOBS applications, telework eligibility, and hybrid schedules in public-sector roles.",
    helps: { REMOTE: undefined, HYBRID: "Reading telework-eligibility notes in postings and asking about in-office expectations.", ONSITE: "Federal resume format, location-based pay, commute and shift planning." } },
  { id: "c4", name: "Ana Torres", headline: "Healthcare and on-site careers", focus: ["ONSITE"], specialties: ["Healthcare careers", "Certifications", "Shift work"], languages: ["English", "Spanish"], formats: ["video", "in-person"], location: "Houston, TX", price: 40, credential: "Example Allied Health Career Advisor", hue: "from-emerald-500 to-teal-500",
    bio: "Helps aspiring medical assistants, CNAs and patient-access reps choose certifications and prepare for on-site interviews and shift schedules.",
    helps: { REMOTE: undefined, HYBRID: undefined, ONSITE: "Certification paths, shift and commute planning, in-person interview prep." } },
  { id: "c5", name: "Sam Okafor", headline: "Choosing the right work arrangement for your life", focus: ["REMOTE", "HYBRID", "ONSITE"], specialties: ["Caregivers & parents", "Disability inclusion", "Career planning"], languages: ["English", "ASL"], formats: ["video", "phone"], location: "Remote", price: 0, credential: "Example Inclusive Career Coaching Certificate", hue: "from-pink-500 to-violet-500",
    bio: "Works with caregivers and disabled job seekers to weigh remote, hybrid and on-site options, and to request accommodations with confidence.",
    helps: { REMOTE: "Flexible schedules and requesting remote work as an accommodation.", HYBRID: "Building a predictable hybrid routine around caregiving.", ONSITE: "Accessibility questions to ask before an on-site interview." } },
  { id: "c6", name: "Lee Park", headline: "Logistics, trades and warehouse careers", focus: ["ONSITE", "HYBRID"], specialties: ["Logistics", "Skilled trades", "Interview prep"], languages: ["English", "Korean"], formats: ["phone", "in-person"], location: "Chicago, IL", price: 30, credential: "Example Skilled Trades Career Certificate", hue: "from-sky-500 to-indigo-500",
    bio: "Helps warehouse, delivery and trades workers move into lead, dispatch and coordinator roles, including hybrid operations jobs.",
    helps: { REMOTE: undefined, HYBRID: "Dispatch and coordinator roles that mix on-site and remote days.", ONSITE: "Forklift and OSHA certifications, safety-record talking points, shift leads." } },
];

const ARR: { id: Arrangement; label: string; icon: typeof Globe; blurb: string }[] = [
  { id: "REMOTE", label: "Remote", icon: Globe, blurb: "Work from home or anywhere" },
  { id: "HYBRID", label: "Hybrid", icon: Shuffle, blurb: "Some days in the office" },
  { id: "ONSITE", label: "On-site", icon: Building2, blurb: "At a workplace every day" },
];
const SESSIONS = [
  { id: "intro", name: "Intro call", mins: 15, note: "Free for every coach" },
  { id: "search", name: "Job search strategy", mins: 45, note: "Remote, hybrid or on-site plan" },
  { id: "resume", name: "Resume review", mins: 45, note: "Bring a Resume Studio version" },
  { id: "interview", name: "Mock interview", mins: 60, note: "Video, phone or in person" },
];
const initials = (n: string) => n.split(" ").map((x) => x[0]).join("");

/** Deterministic demo availability for the next 7 days, shown in the viewer's own time zone. */
function slotsFor(coachId: string) {
  const out: { day: Date; times: Date[] }[] = [];
  const seed = coachId.charCodeAt(1);
  for (let d = 1; d <= 7; d++) {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + d);
    if (day.getDay() === 0) continue;
    const times = [9, 10, 11, 13, 14, 15, 16, 18].filter((h, i) => (h + d + seed + i) % 3 !== 0).map((h) => { const t = new Date(day); t.setHours(h, (d + seed) % 2 ? 30 : 0); return t; });
    out.push({ day, times });
  }
  return out;
}

export type Booking = { id: string; coach: string; session: string; when: string; format: string; goal: string };

export function Coaches({ bookings, setBookings, initial }: { bookings: Booking[]; setBookings: (f: (b: Booking[]) => Booking[]) => void; initial?: Arrangement }) {
  const [arr, setArr] = useState<Arrangement | "ALL">(initial ?? "ALL");
  const [free, setFree] = useState(false);
  const [lang, setLang] = useState("");
  const [open, setOpen] = useState<Coach | null>(null);
  const langs = [...new Set(COACHES.flatMap((c) => c.languages))].sort();
  const list = COACHES.filter((c) => (arr === "ALL" || c.focus.includes(arr)) && (!free || c.price === 0) && (!lang || c.languages.includes(lang)));
  const count = (a: Arrangement | "ALL") => COACHES.filter((c) => a === "ALL" || c.focus.includes(a)).length;

  return (
    <>
      <div className="mb-6 animate-fadeup">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Career Coaches</p>
        <h1 className="text-3xl font-semibold md:text-4xl">Meet a coach for the way you want to work</h1>
        <p className="mt-2 max-w-3xl text-slate-400">Find human support for a remote, hybrid or on-site job search. Book a free intro call, plan your strategy, get a resume review, or practice interviews.</p>
      </div>
      <div className="mb-6"><Notice tone="amber">Every coach here is a <b>fictional DEMO profile</b>, and booking is simulated in your browser. In the full app, coaches are listed after admin review, credentials show &ldquo;Verified&rdquo; only after an admin checks them with the issuer, and you book on the coach&apos;s own site.</Notice></div>

      <p className="mb-3 text-sm text-slate-400">What kind of work are you looking for?</p>
      <div className="mb-5 grid gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Work arrangement">
        <button role="radio" aria-checked={arr === "ALL"} onClick={() => setArr("ALL")} className={cx("glass p-4 text-left transition", arr === "ALL" ? "border-violet-400/60 bg-violet-500/15 shadow-[0_0_30px_-10px_rgba(139,92,246,.8)]" : "hover:border-white/20")}>
          <Users size={20} className="text-violet-300" /><div className="mt-2 font-semibold">Any arrangement</div><div className="text-xs text-slate-400">{count("ALL")} coaches</div></button>
        {ARR.map(({ id, label, icon: Icon, blurb }) => (
          <button key={id} role="radio" aria-checked={arr === id} onClick={() => setArr(id)} className={cx("glass p-4 text-left transition", arr === id ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_30px_-10px_rgba(34,211,238,.8)]" : "hover:border-white/20")}>
            <Icon size={20} className="text-cyan-300" /><div className="mt-2 font-semibold">{label}</div><div className="text-xs text-slate-400">{blurb} · {count(id)} coaches</div></button>))}
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-violet-500" checked={free} onChange={(e) => setFree(e.target.checked)} />Free sessions only</label>
        <label className="flex items-center gap-2"><Languages size={15} className="text-slate-400" /><select aria-label="Language" className="input w-40 py-1.5" value={lang} onChange={(e) => setLang(e.target.value)}><option value="">Any language</option>{langs.map((l) => <option key={l}>{l}</option>)}</select></label>
        <span className="text-slate-500" aria-live="polite">{list.length} coach{list.length === 1 ? "" : "es"}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{list.map((c) => (
        <article key={c.id} className="glass glass-hover flex flex-col p-5">
          <div className="flex items-start gap-3">
            <div className={cx("grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br font-display text-lg font-semibold", c.hue)} aria-hidden="true">{initials(c.name)}</div>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><h2 className="font-semibold">{c.name}</h2><span className="chip-amber">DEMO</span></div><p className="text-sm text-slate-400">{c.headline}</p></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{c.focus.map((f) => { const a = ARR.find((x) => x.id === f)!; return <span key={f} className="chip-cyan"><a.icon size={11} />{a.label}</span>; })}</div>
          {arr !== "ALL" && c.helps[arr] && <p className="mt-3 rounded-lg bg-cyan-500/[0.06] p-2.5 text-xs text-cyan-50"><b>For {ARR.find((x) => x.id === arr)!.label.toLowerCase()} searches:</b> {c.helps[arr]}</p>}
          <p className="mt-3 line-clamp-3 flex-1 text-sm text-slate-300">{c.bio}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-xs text-slate-400">
            <span>{c.price === 0 ? <span className="text-emerald-300">Free</span> : `From $${c.price}`} · {c.languages.join(", ")}</span>
            <button className="btn-primary py-2 text-xs" onClick={() => setOpen(c)}>View & book<ArrowRight size={13} /></button>
          </div>
        </article>))}</div>
      {list.length === 0 && <p className="mt-6 text-center text-slate-400">No coaches match those filters. Try a different language, or include paid sessions.</p>}

      {bookings.length > 0 && (
        <Card className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Calendar size={17} className="text-cyan-300" />My coaching sessions <span className="chip-amber">DEMO</span></h2>
          <ul className="divide-y divide-white/5">{bookings.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div><div className="font-medium">{b.session} with {b.coach}</div><div className="text-xs text-slate-400">{b.when} · {b.format}{b.goal && ` · “${b.goal.slice(0, 60)}${b.goal.length > 60 ? "…" : ""}”`}</div></div>
              <button className="btn-ghost py-1.5 text-xs" onClick={() => setBookings((x) => x.filter((y) => y.id !== b.id))}><Trash2 size={13} />Cancel</button>
            </li>))}</ul>
        </Card>)}

      {open && <BookingDialog coach={open} arr={arr} onClose={() => setOpen(null)} onBooked={(b) => setBookings((x) => [b, ...x])} />}
    </>
  );
}

function BookingDialog({ coach, arr, onClose, onBooked }: { coach: Coach; arr: Arrangement | "ALL"; onClose: () => void; onBooked: (b: Booking) => void }) {
  const [step, setStep] = useState(0);
  const [session, setSession] = useState(SESSIONS[0].id);
  const [format, setFormat] = useState(coach.formats[0]);
  const [slot, setSlot] = useState<Date | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [goal, setGoal] = useState("");
  const [want, setWant] = useState<Arrangement | "">(arr === "ALL" ? "" : arr);
  const [access, setAccess] = useState("");
  const [done, setDone] = useState<Booking | null>(null);
  const days = useMemo(() => slotsFor(coach.id), [coach.id]);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const s = SESSIONS.find((x) => x.id === session)!;
  const price = session === "intro" || coach.price === 0 ? "Free" : `$${coach.price}`;
  const fmtIcon = { video: Video, phone: Phone, "in-person": MapPin };

  const confirm = () => {
    const when = `${slot!.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, ${slot!.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
    const b: Booking = { id: `b${Date.now()}`, coach: coach.name, session: s.name, when, format: format === "in-person" ? `In person (${coach.location})` : format[0].toUpperCase() + format.slice(1), goal: [want && `${ARR.find((a) => a.id === want)!.label} search`, goal].filter(Boolean).join(": ") };
    onBooked(b); setDone(b);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Book with ${coach.name}`} onClick={onClose}>
      <div className="ep-pop max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-800 p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className={cx("grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br font-display text-lg font-semibold", coach.hue)} aria-hidden="true">{initials(coach.name)}</div>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><h2 className="text-xl font-semibold">{coach.name}</h2><span className="chip-amber">DEMO</span></div><p className="text-sm text-slate-400">{coach.headline}</p></div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Close"><X size={18} /></button>
        </div>

        {done ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 shadow-[0_0_50px_-5px_rgba(34,211,238,.7)]"><Check size={30} /></div>
            <h3 className="text-2xl font-semibold">Session requested</h3>
            <p className="mt-2 text-slate-300">{done.session} with {done.coach}<br />{done.when} · {done.format}</p>
            <p className="mx-auto mt-4 max-w-md text-xs text-amber-200/90">Demo only: no real appointment was made and nobody was contacted. In the full app, you finish booking on the coach&apos;s own scheduling page.</p>
            <button className="btn-primary mt-6" onClick={onClose}>Done</button>
          </div>
        ) : (<>
          <ol className="mt-5 flex gap-2 text-xs" aria-label="Booking steps">{["Session", "Time", "Your goals", "Confirm"].map((l, i) => (
            <li key={l} className={cx("flex-1 rounded-full px-2 py-1 text-center", i === step ? "bg-violet-500/25 text-white" : i < step ? "bg-emerald-500/15 text-emerald-200" : "bg-white/5 text-slate-500")}>{i < step ? "✓ " : ""}{l}</li>))}</ol>

          {step === 0 && <div className="mt-5 space-y-5">
            <p className="text-sm text-slate-300">{coach.bio}</p>
            <div className="grid gap-2 sm:grid-cols-3">{ARR.filter((a) => coach.helps[a.id]).map((a) => <div key={a.id} className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.05] p-3 text-xs"><div className="mb-1 flex items-center gap-1 font-semibold text-cyan-200"><a.icon size={13} />{a.label}</div>{coach.helps[a.id]}</div>)}</div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldQuestion size={13} />{coach.credential}: self-reported (DEMO, not verified)</p>
            <fieldset><legend className="label">Choose a session</legend><div className="grid gap-2 sm:grid-cols-2">{SESSIONS.map((x) => (
              <label key={x.id} className={cx("cursor-pointer rounded-xl border p-3 text-sm transition", session === x.id ? "border-violet-400/60 bg-violet-500/15" : "border-white/10 hover:border-white/25")}>
                <input type="radio" name="session" className="sr-only" checked={session === x.id} onChange={() => setSession(x.id)} />
                <div className="flex justify-between font-medium"><span>{x.name}</span><span className="text-slate-400">{x.mins} min</span></div><div className="text-xs text-slate-400">{x.note}</div></label>))}</div></fieldset>
            <fieldset><legend className="label">Format</legend><div className="flex flex-wrap gap-2">{coach.formats.map((f) => { const I = fmtIcon[f]; return (
              <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f)} className={cx("btn-ghost py-2 text-xs", format === f && "border-cyan-400/50 bg-cyan-500/15 text-white")}><I size={14} />{f === "in-person" ? `In person · ${coach.location}` : f[0].toUpperCase() + f.slice(1)}</button>); })}</div></fieldset>
          </div>}

          {step === 1 && <div className="mt-5">
            <p className="mb-3 text-xs text-slate-400">Times shown in your time zone ({tz}).</p>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{days.map((d, i) => (
              <button key={i} onClick={() => setDayIdx(i)} aria-pressed={dayIdx === i} className={cx("shrink-0 rounded-xl border px-3 py-2 text-center text-sm", dayIdx === i ? "border-violet-400/60 bg-violet-500/15" : "border-white/10 hover:border-white/25")}>
                <div className="text-xs text-slate-400">{d.day.toLocaleDateString(undefined, { weekday: "short" })}</div><div className="font-semibold">{d.day.getDate()}</div></button>))}</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{days[dayIdx].times.map((t) => (
              <button key={t.toISOString()} onClick={() => setSlot(t)} aria-pressed={slot?.getTime() === t.getTime()} className={cx("rounded-lg border px-2 py-2 text-sm", slot?.getTime() === t.getTime() ? "border-cyan-400/60 bg-cyan-500/20 text-white" : "border-white/10 hover:border-white/25")}>
                <Clock size={12} className="mr-1 inline text-slate-400" />{t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</button>))}</div>
          </div>}

          {step === 2 && <div className="mt-5 space-y-4">
            <fieldset><legend className="label">I&apos;m searching for…</legend><div className="flex flex-wrap gap-2">{ARR.map((a) => (
              <button key={a.id} type="button" aria-pressed={want === a.id} onClick={() => setWant(want === a.id ? "" : a.id)} className={cx("btn-ghost py-2 text-xs", want === a.id && "border-cyan-400/50 bg-cyan-500/15 text-white")}><a.icon size={14} />{a.label}</button>))}</div></fieldset>
            <div><label htmlFor="goal" className="label">What would you like help with? (optional)</label><textarea id="goal" className="input min-h-[90px]" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. I'm moving from retail to a remote customer support role and want to practice video interviews." /></div>
            <div><label htmlFor="acc" className="label">Accessibility needs for the session (optional)</label><input id="acc" className="input" value={access} onChange={(e) => setAccess(e.target.value)} placeholder="e.g. captions, ASL interpreter, extra time" /></div>
            <p className="text-xs text-slate-500">Only share what you&apos;re comfortable with. You&apos;ll never be asked about race, gender, age or other personal characteristics.</p>
          </div>}

          {step === 3 && slot && <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm">
            <Row k="Coach" v={coach.name} /><Row k="Session" v={`${s.name} (${s.mins} min)`} /><Row k="When" v={`${slot.toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}`} />
            <Row k="Format" v={format === "in-person" ? `In person · ${coach.location}` : format} /><Row k="Focus" v={want ? ARR.find((a) => a.id === want)!.label : "Not specified"} /><Row k="Price" v={price} />
            {access && <Row k="Accessibility" v={access} />}
          </div>}

          <div className="mt-6 flex justify-between">
            <button className="btn-ghost" onClick={() => (step ? setStep(step - 1) : onClose())}><ArrowLeft size={15} />{step ? "Back" : "Cancel"}</button>
            {step < 3 ? <button className="btn-primary" disabled={step === 1 && !slot} onClick={() => setStep(step + 1)}>Continue<ArrowRight size={15} /></button>
              : <button className="btn-primary" onClick={confirm}><Check size={15} />Request session</button>}
          </div>
        </>)}
      </div>
    </div>
  );
}
const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-4"><span className="text-slate-400">{k}</span><span className="text-right capitalize-first">{v}</span></div>;
