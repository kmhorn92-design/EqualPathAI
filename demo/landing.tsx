/**
 * Immersive, interactive landing page for the EqualPath AI demo.
 * Uses the app's real lexicon (findKeywords) and fabrication guard (guardSuggestion).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowDown, ShieldCheck, Sparkles, Check, X, FileText, Briefcase, KanbanSquare, GraduationCap, Wand2, Lock, Eye, HeartHandshake } from "lucide-react";
import { findKeywords } from "@/lib/resume/lexicon";
import { guardSuggestion } from "@/lib/resume/analyze";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1. Interactive path-network canvas ---------- */
function PathField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    let w = 0, h = 0, raf = 0; const dpr = Math.min(devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    type N = { x: number; y: number; vx: number; vy: number; r: number; hue: number };
    let nodes: N[] = []; const pulses: { x: number; y: number; t: number }[] = [];
    const resize = () => {
      w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(110, Math.floor((w * h) / 14000));
      nodes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: 1 + Math.random() * 1.8, hue: Math.random() }));
    };
    const still = reduced();
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of nodes) {
        if (!still) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
        const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
        if (d < 180 && !still) { p.x += dx * 0.006; p.y += dy * 0.006; }
      }
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          const near = Math.hypot(mouse.x - (a.x + b.x) / 2, mouse.y - (a.y + b.y) / 2) < 160;
          ctx.strokeStyle = near ? `rgba(34,211,238,${0.55 * (1 - d / 120)})` : `rgba(139,92,246,${0.18 * (1 - d / 120)})`;
          ctx.lineWidth = near ? 1.2 : 0.7; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      for (const p of nodes) {
        const near = Math.hypot(mouse.x - p.x, mouse.y - p.y) < 160;
        ctx.fillStyle = near ? "#a5f3fc" : p.hue > 0.5 ? "rgba(167,139,250,.85)" : "rgba(34,211,238,.7)";
        ctx.beginPath(); ctx.arc(p.x, p.y, near ? p.r + 1.2 : p.r, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const q = pulses[i]; q.t += 1;
        const rad = q.t * 4, alpha = Math.max(0, 1 - q.t / 60);
        ctx.strokeStyle = `rgba(34,211,238,${alpha})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(139,92,246,${alpha * 0.7})`; ctx.beginPath(); ctx.arc(q.x, q.y, rad * 0.6, 0, Math.PI * 2); ctx.stroke();
        for (const p of nodes) { const d = Math.hypot(p.x - q.x, p.y - q.y); if (Math.abs(d - rad) < 6 && !still) { p.vx += (p.x - q.x) / d * 0.15; p.vy += (p.y - q.y) / d * 0.15; } }
        if (q.t > 60) pulses.splice(i, 1);
      }
      for (const p of nodes) { const s = Math.hypot(p.vx, p.vy); if (s > 0.8) { p.vx *= 0.96; p.vy *= 0.96; } }
      raf = requestAnimationFrame(draw);
    };
    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const leave = () => { mouse.x = mouse.y = -9999; };
    const click = (e: PointerEvent) => { const r = c.getBoundingClientRect(); pulses.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: 0 }); };
    resize(); draw();
    addEventListener("resize", resize); c.addEventListener("pointermove", move); c.addEventListener("pointerleave", leave); c.addEventListener("pointerdown", click);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); c.removeEventListener("pointermove", move); c.removeEventListener("pointerleave", leave); c.removeEventListener("pointerdown", click); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full cursor-crosshair" aria-hidden="true" />;
}

/* ---------- helpers ---------- */
function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null); const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); o.disconnect(); } }, { threshold });
    o.observe(ref.current); return () => o.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.15);
  return <div ref={ref} className={className} style={{ opacity: seen ? 1 : 0, transform: seen ? "none" : "translateY(28px)", transition: `opacity .8s ${delay}ms cubic-bezier(.2,.7,.2,1), transform .8s ${delay}ms cubic-bezier(.2,.7,.2,1)` }}>{children}</div>;
}
function Tilt({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    if (reduced()) return; const el = ref.current!; const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(0)`;
    el.style.setProperty("--gx", `${(x + 0.5) * 100}%`); el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
  };
  return <div ref={ref} onPointerMove={onMove} onPointerLeave={() => { ref.current!.style.transform = ""; }} className={`ep-tilt ${className}`}>{children}</div>;
}

const WORDS = ["Skills.", "Potential.", "Opportunity."];
function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => { if (reduced()) return; const t = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2200); return () => clearInterval(t); }, []);
  return (
    <span className="relative inline-block h-[1.08em] overflow-hidden align-bottom" aria-live="polite">
      {WORDS.map((w, k) => (
        <span key={w} className="gradient-text absolute left-0 top-0 whitespace-nowrap transition-all duration-700" style={{ transform: `translateY(${(k - i) * 110}%)`, opacity: k === i ? 1 : 0 }}>{w}</span>
      ))}
      <span className="invisible whitespace-nowrap">Opportunity.</span>
    </span>
  );
}

/* ---------- 2. Transferable skills explorer (real lexicon) ---------- */
const PAST: Record<string, { text: string; roles: string[] }> = {
  "Retail associate": { text: "customer service, cash handling, inventory, upselling sales, teamwork, scheduling", roles: ["Customer Support Specialist", "Inventory Coordinator", "Bank Teller"] },
  "Caregiver": { text: "scheduling appointments, patient care, communication, time management, record keeping, problem solving", roles: ["Patient Care Technician", "Medical Receptionist", "Care Coordinator"] },
  "Restaurant server": { text: "guest services, cash handling, POS, conflict resolution, de-escalate, multitasking, teamwork", roles: ["Front Desk Agent", "Customer Service Rep", "Event Coordinator"] },
  "Warehouse worker": { text: "inventory management, shipping, receiving, forklift, OSHA safety protocols, teamwork", roles: ["Logistics Coordinator", "Supply Chain Assistant", "Shipping Lead"] },
  "Call center agent": { text: "customer support, CRM, Zendesk, data entry, conflict resolution, typing, troubleshooting", roles: ["IT Help Desk Tech", "Client Success Associate", "Billing Specialist"] },
  "Student": { text: "research, writing, Microsoft Office, Google Docs, presentations powerpoint, teamwork, tutoring", roles: ["Administrative Assistant", "Program Assistant", "Junior Data Analyst"] },
};

function SkillExplorer() {
  const [pick, setPick] = useState("Caregiver");
  const [custom, setCustom] = useState("");
  const text = custom.trim() ? custom : PAST[pick].text;
  const skills = useMemo(() => findKeywords(text), [text]);
  const roles = custom.trim() ? [] : PAST[pick].roles;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <p className="mb-3 text-sm text-slate-400">Choose something you&apos;ve done:</p>
        <div className="flex flex-wrap gap-2">{Object.keys(PAST).map((k) => (
          <button key={k} onClick={() => { setPick(k); setCustom(""); }} aria-pressed={pick === k && !custom}
            className={`rounded-full border px-4 py-2 text-sm transition duration-300 ${pick === k && !custom ? "border-cyan-300/60 bg-cyan-400/15 text-white shadow-[0_0_24px_-4px_rgba(34,211,238,.6)]" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-violet-400/50"}`}>{k}</button>))}</div>
        <label htmlFor="own" className="mt-6 block text-sm text-slate-400">…or describe it in your own words:</label>
        <textarea id="own" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. I volunteered at a food pantry, kept spreadsheets, trained new volunteers, and answered phones in Spanish."
          className="input mt-2 min-h-[110px]" />
        <p className="mt-2 text-xs text-slate-500">This runs the same skill-matching engine that powers Resume Studio.</p>
      </div>
      <div className="glass relative min-h-[300px] overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-600/25 blur-3xl" />
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Skills found</p>
        <div className="mt-4 flex min-h-[90px] flex-wrap gap-2" aria-live="polite">
          {skills.length ? skills.map((s, i) => (
            <span key={`${text}-${s}`} className="ep-pop chip-green px-3 py-1 text-sm" style={{ animationDelay: `${i * 70}ms` }}><Check size={12} />{s}</span>))
            : <span className="text-sm text-slate-500">Keep typing. Try words like scheduling, inventory, customer service, Excel, or training.</span>}
        </div>
        {roles.length > 0 && <>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-violet-300">Roles that use these skills</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">{roles.map((r, i) => (
            <div key={`${pick}-${r}`} className="ep-pop rounded-xl border border-violet-400/25 bg-violet-500/10 p-3 text-sm" style={{ animationDelay: `${300 + i * 120}ms` }}>
              <Briefcase size={14} className="mb-1 text-violet-300" />{r}</div>))}</div>
        </>}
        <p className="mt-6 text-xs text-slate-500">These are examples to explore, not predictions. Describe your experience exactly as it happened.</p>
      </div>
    </div>
  );
}

/* ---------- 3. Honest rewrite + fabrication guard (real guard) ---------- */
const BEFORE = "Responsible for handling 60 inbound calls per day using Zendesk";
const CORPUS = "Responsible for handling 60 inbound calls per day using Zendesk. Helped with training new hires on de-escalation. Customer Service, Microsoft Office";
const HONEST = "Handled 60 inbound calls per day using Zendesk";
const EXAGGERATED = "Led a team handling 200 calls per day in Salesforce, raising satisfaction 35%";

function GuardDemo() {
  const [mode, setMode] = useState<"before" | "honest" | "exaggerate">("before");
  const [custom, setCustom] = useState("");
  const after = custom || (mode === "honest" ? HONEST : mode === "exaggerate" ? EXAGGERATED : "");
  const verdict = after ? guardSuggestion(BEFORE, after, CORPUS) : null;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Tilt className="glass p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Your original bullet</p>
        <p className="mt-2 rounded-xl bg-white/[0.04] p-4 text-lg">{BEFORE}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => { setCustom(""); setMode("honest"); }} className="btn-primary"><Wand2 size={16} />Rewrite honestly</button>
          <button onClick={() => { setCustom(""); setMode("exaggerate"); }} className="btn-ghost border-rose-400/30 text-rose-200 hover:bg-rose-500/10"><Sparkles size={16} />Try to exaggerate</button>
        </div>
        <label htmlFor="mine" className="mt-5 block text-sm text-slate-400">Or write your own rewrite:</label>
        <input id="mine" className="input mt-2" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Type a version and watch the guard react…" />
      </Tilt>
      <div className="relative">
        {!verdict ? (
          <div className="glass grid h-full min-h-[260px] place-items-center p-6 text-center text-slate-400"><div><ShieldCheck className="mx-auto mb-3 text-violet-300" size={36} />Pick an option to see the fabrication guard in action.</div></div>
        ) : (
          <div key={after} className={`ep-pop glass h-full p-6 ${verdict.ok ? "border-emerald-400/40 shadow-[0_0_60px_-15px_rgba(52,211,153,.6)]" : "border-rose-400/40 shadow-[0_0_60px_-15px_rgba(251,113,133,.6)]"}`}>
            <div className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${verdict.ok ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"}`}>
              {verdict.ok ? <><Check size={15} />Allowed: same facts, clearer words</> : <><X size={15} />Blocked: {verdict.reason}</>}
            </div>
            <p className={`rounded-xl p-4 text-lg ${verdict.ok ? "bg-emerald-500/10 text-emerald-50" : "bg-rose-500/10 text-rose-100 line-through decoration-rose-300/60"}`}>{after}</p>
            <p className="mt-4 text-sm text-slate-400">{verdict.ok ? "You still approve every change before it goes on your resume." : "EqualPath never adds metrics, tools or achievements you didn't give it, even if they sound impressive. If you have real results, add them yourself."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- 4. Scroll-drawn journey ---------- */
const STEPS = [
  { icon: FileText, title: "Bring your real experience", body: "Upload or paste your resume. It's encrypted, and every field is yours to edit." },
  { icon: Wand2, title: "Tailor truthfully", body: "Compare it to a job post. See matched and missing keywords, then approve each change." },
  { icon: Briefcase, title: "Find verified jobs", body: "Listings come from authorized sources with direct employer links, and the count shown is the real count." },
  { icon: KanbanSquare, title: "Apply, practice, follow up", body: "Track applications, practice assessments, and get follow-up drafts." },
];
function Journey() {
  const wrap = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => { const el = wrap.current; if (!el) return; const r = el.getBoundingClientRect(); const vh = innerHeight; setP(Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height)))); };
    on(); addEventListener("scroll", on, { passive: true }); return () => removeEventListener("scroll", on);
  }, []);
  const shown = reduced() ? 1 : p;
  return (
    <div ref={wrap} className="relative mx-auto max-w-3xl">
      <svg className="absolute left-6 top-0 h-full w-2 md:left-1/2 md:-translate-x-1/2" preserveAspectRatio="none" viewBox="0 0 2 100" aria-hidden="true">
        <line x1="1" y1="0" x2="1" y2="100" stroke="rgba(255,255,255,.08)" strokeWidth="2" />
        <line x1="1" y1="0" x2="1" y2={shown * 100} stroke="url(#jg)" strokeWidth="2" />
        <defs><linearGradient id="jg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8B5CF6" /><stop offset="1" stopColor="#22D3EE" /></linearGradient></defs>
      </svg>
      <ol className="space-y-14">{STEPS.map(({ icon: Icon, title, body }, i) => {
        const on = shown >= (i + 0.3) / STEPS.length;
        return (
          <li key={title} className={`relative grid items-center gap-4 pl-16 md:grid-cols-2 md:pl-0 ${i % 2 ? "md:[&>div:first-child]:order-2" : ""}`}>
            <div className={`${i % 2 ? "md:pl-14" : "md:pr-14 md:text-right"}`} style={{ opacity: on ? 1 : 0.25, transform: on ? "none" : "translateY(16px)", transition: "all .7s cubic-bezier(.2,.7,.2,1)" }}>
              <p className="font-display text-xs uppercase tracking-[0.25em] text-cyan-300">Step {i + 1}</p>
              <h3 className="mt-1 text-2xl font-semibold">{title}</h3><p className="mt-2 text-slate-400">{body}</p>
            </div>
            <div className="hidden md:block" />
            <span className={`absolute left-6 top-1 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full border transition-all duration-700 md:left-1/2 md:top-1/2 md:-translate-y-1/2 ${on ? "border-cyan-300/70 bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-[0_0_30px_rgba(34,211,238,.6)]" : "border-white/15 bg-ink-700 text-slate-500"}`}><Icon size={20} /></span>
          </li>);
      })}</ol>
    </div>
  );
}

/* ---------- page ---------- */
export function Landing({ onEnter }: { onEnter: (to?: "studio" | "jobs" | "practice" | "learn") => void }) {
  const [leaving, setLeaving] = useState(false);
  const enter = (to?: "studio" | "jobs" | "practice" | "learn") => {
    if (reduced()) return onEnter(to);
    setLeaving(true); setTimeout(() => onEnter(to), 650);
  };
  const [mx, setMx] = useState({ x: 50, y: 40 });
  return (
    <div className={`relative overflow-hidden transition-all duration-700 ${leaving ? "scale-[1.06] opacity-0 blur-sm" : ""}`}
      onPointerMove={(e) => setMx({ x: (e.clientX / innerWidth) * 100, y: (e.clientY / innerHeight) * 100 })}>
      <style>{`
        @keyframes ep-pop { from { opacity: 0; transform: translateY(10px) scale(.92) } to { opacity: 1; transform: none } }
        .ep-pop { animation: ep-pop .55s cubic-bezier(.2,.8,.2,1.2) both }
        @keyframes ep-rise { from { opacity: 0; transform: translateY(40px); filter: blur(8px) } to { opacity: 1; transform: none; filter: none } }
        .ep-rise { animation: ep-rise 1s cubic-bezier(.2,.7,.2,1) both }
        @keyframes ep-ring { to { transform: rotate(360deg) } }
        @keyframes ep-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(8px) } }
        .ep-tilt { transition: transform .25s ease; transform-style: preserve-3d; background-image: radial-gradient(400px circle at var(--gx,50%) var(--gy,50%), rgba(139,92,246,.12), transparent 60%); }
        @media (prefers-reduced-motion: reduce) { .ep-pop, .ep-rise { animation: none } }
      `}</style>

      {/* HERO */}
      <section className="relative flex min-h-[calc(100vh-57px)] items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 transition-[background] duration-300" style={{ background: `radial-gradient(700px circle at ${mx.x}% ${mx.y}%, rgba(139,92,246,.22), transparent 55%), radial-gradient(600px circle at 85% 90%, rgba(34,211,238,.12), transparent 60%)` }} />
        <PathField />
        <div className="pointer-events-none relative mx-auto w-full max-w-6xl px-6 py-20">
          <span className="ep-rise chip-violet pointer-events-auto mb-6" style={{ animationDelay: "100ms" }}><ShieldCheck size={13} />Truthful by design · No fabricated credentials</span>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] sm:text-7xl md:text-8xl">
            <span className="ep-rise block" style={{ animationDelay: "200ms" }}>Your <RotatingWord /></span>
            <span className="ep-rise block text-slate-300" style={{ animationDelay: "380ms" }}>Your path.</span>
          </h1>
          <p className="ep-rise mt-6 max-w-xl text-lg text-slate-300/90 md:text-xl" style={{ animationDelay: "560ms" }}>
            Hiring software screens you before a person ever does. EqualPath AI shows you how it works and helps you present your <em className="not-italic text-cyan-200">real</em> skills clearly. It never asks you to pretend.
          </p>
          <div className="ep-rise pointer-events-auto mt-9 flex flex-wrap gap-3" style={{ animationDelay: "720ms" }}>
            <button onClick={() => enter("studio")} className="btn-primary px-7 py-3.5 text-base">Enter EqualPath <ArrowRight size={18} /></button>
            <a href="#explore" onClick={(e) => { e.preventDefault(); document.getElementById("explore")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }); }} className="btn-ghost px-7 py-3.5 text-base">Explore first</a>
          </div>
          <p className="ep-rise mt-6 text-xs text-slate-500" style={{ animationDelay: "900ms" }}>Tip: move your cursor (or tap) anywhere in the background.</p>
        </div>
        <ArrowDown className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500" style={{ animation: reduced() ? "none" : "ep-bob 2s ease-in-out infinite" }} aria-hidden="true" />
      </section>

      {/* SKILLS */}
      <section id="explore" className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
        <Reveal><p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">Try it · 01</p>
          <h2 className="mt-2 max-w-3xl text-4xl font-semibold md:text-5xl">You already have more skills than you think.</h2>
          <p className="mt-3 max-w-2xl text-slate-400">Caregiving, retail, school, volunteering: it all counts. Pick one and watch your transferable skills appear.</p></Reveal>
        <Reveal delay={150} className="mt-10"><SkillExplorer /></Reveal>
      </section>

      {/* GUARD */}
      <section className="relative overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40 [mask-image:linear-gradient(transparent,black,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-6">
          <Reveal><p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">Try it · 02</p>
            <h2 className="mt-2 max-w-3xl text-4xl font-semibold md:text-5xl">Stronger words. <span className="gradient-text">Never fake facts.</span></h2>
            <p className="mt-3 max-w-2xl text-slate-400">Every AI rewrite passes a fabrication guard. Try to sneak in a fake number or tool and see what happens.</p></Reveal>
          <Reveal delay={150} className="mt-10"><GuardDemo /></Reveal>
        </div>
      </section>

      {/* JOURNEY */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="mb-16 text-center"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">Your journey</p>
          <h2 className="mt-2 text-4xl font-semibold md:text-5xl">From experience to offer</h2></Reveal>
        <Journey />
      </section>

      {/* PRINCIPLES */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-3">{[
          [Eye, "Transparent AI", "Every suggestion explains why it was made. No black boxes, and no made-up ATS score."],
          [Lock, "Private by default", "Resumes are encrypted. Your data is never used for training unless you opt in, and you can delete it in one click."],
          [HeartHandshake, "You stay in control", "You approve every change. EqualPath never makes hiring decisions or guesses who you are."],
        ].map(([I, t, b], i) => { const Icon = I as typeof Eye; return (
          <Reveal key={t as string} delay={i * 120}><Tilt className="glass h-full p-7">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/15 text-cyan-200 ring-1 ring-white/10"><Icon size={22} /></div>
            <h3 className="text-xl font-semibold">{t as string}</h3><p className="mt-2 text-slate-400">{b as string}</p></Tilt></Reveal>); })}</div>
      </section>

      {/* PORTAL */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-6 py-24 text-center">
        <div className="pointer-events-none absolute h-[520px] w-[520px] rounded-full border border-violet-500/25" style={{ animation: reduced() ? "none" : "ep-ring 30s linear infinite" }} />
        <div className="pointer-events-none absolute h-[400px] w-[400px] rounded-full border border-dashed border-cyan-400/30" style={{ animation: reduced() ? "none" : "ep-ring 20s linear infinite reverse" }} />
        <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-gradient-to-br from-violet-600/40 to-cyan-500/30 blur-3xl animate-pulseglow" />
        <Reveal className="relative">
          <h2 className="font-display text-5xl font-semibold md:text-6xl">Ready when you are.</h2>
          <p className="mx-auto mt-4 max-w-md text-slate-300">Step inside to tailor a resume, browse jobs, and practice. It's free, and you'll never be asked for demographic information.</p>
          <button onClick={() => enter("studio")} className="group relative mt-10 inline-grid h-40 w-40 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-lg font-semibold shadow-[0_0_80px_-10px_rgba(139,92,246,.9)] transition duration-500 hover:scale-110 hover:shadow-[0_0_120px_-5px_rgba(34,211,238,.9)]">
            <span className="absolute inset-1 rounded-full bg-ink/80 transition group-hover:bg-ink/40" />
            <span className="relative flex flex-col items-center gap-1">Enter<ArrowRight className="transition group-hover:translate-x-1" /></span>
          </button>
          <div className="mt-10 flex flex-wrap justify-center gap-2 text-sm">
            {([["studio", "Resume Studio"], ["jobs", "Job Board"], ["practice", "Practice tests"], ["learn", "Learning Hub"]] as const).map(([to, l]) => (
              <button key={to} onClick={() => enter(to)} className="chip px-3 py-1.5 hover:border-cyan-300/50 hover:text-white">{l} →</button>))}
          </div>
          <p className="mx-auto mt-8 max-w-md text-xs text-slate-500"><GraduationCap size={12} className="mr-1 inline" />Interactive demo. Sample data stays in this browser tab, and nothing is sent anywhere.</p>
        </Reveal>
      </section>
    </div>
  );
}
