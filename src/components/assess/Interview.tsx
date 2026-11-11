"use client";
import { useRef, useState } from "react";
import { Loader2, Check, Circle, Lightbulb } from "lucide-react";
import { cx, ErrorBox } from "../ui";

type FB = { star: { parts: Record<string, boolean>; words: number; tips: string[] }; ai: string | null };

export function Interview({ prompts }: { prompts: { q: string; tip: string }[] }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<string[]>(prompts.map(() => ""));
  const [fb, setFb] = useState<(FB | null)[]>(prompts.map(() => null));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(Date.now());
  const p = prompts[i];

  async function feedback() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/interview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: p.q, answer: answers[i] }) });
    setBusy(false);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(d.error ?? "Feedback unavailable");
    setFb((f) => f.map((x, k) => (k === i ? d : x)));
    const answered = fb.filter(Boolean).length + (fb[i] ? 0 : 1);
    fetch("/api/assessments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "interview", module: "mock-interview", answered, total: prompts.length, durationSec: Math.round((Date.now() - started.current) / 1000) }) });
  }
  const f = fb[i];
  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <ol className="glass space-y-1 p-2">{prompts.map((x, k) => (
        <li key={k}><button onClick={() => setI(k)} className={cx("flex w-full items-start gap-2 rounded-lg p-2.5 text-left text-sm", k === i ? "bg-white/10" : "text-slate-400 hover:bg-white/5")}>
          {fb[k] ? <Check size={15} className="mt-0.5 shrink-0 text-emerald-300" /> : <Circle size={15} className="mt-0.5 shrink-0" />}{x.q}</button></li>))}</ol>
      <div className="glass p-6">
        <p className="text-xs uppercase tracking-wider text-cyan-300">Question {i + 1}</p>
        <h2 className="mt-1 text-xl font-semibold">{p.q}</h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-slate-400"><Lightbulb size={15} className="mt-0.5 shrink-0 text-violet-300" />{p.tip}</p>
        <label htmlFor="ans" className="label mt-5">Your answer (type it, or use your device&apos;s dictation)</label>
        <textarea id="ans" className="input min-h-[200px]" value={answers[i]} onChange={(e) => setAnswers((a) => a.map((x, k) => (k === i ? e.target.value : x)))} placeholder="Situation… Task… Action… Result…" />
        <div className="mt-3 flex items-center gap-3"><button className="btn-primary" onClick={feedback} disabled={busy || answers[i].trim().length < 10}>{busy && <Loader2 size={16} className="animate-spin" />}Get feedback</button><span className="text-xs text-slate-500">{answers[i].trim().split(/\s+/).filter(Boolean).length} words</span></div>
        {err && <div className="mt-3"><ErrorBox>{err}</ErrorBox></div>}
        {f && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2">{Object.entries(f.star.parts).map(([k, ok]) => <span key={k} className={ok ? "chip-green" : "chip-amber"}>{ok ? <Check size={11} /> : <Circle size={11} />}{k[0].toUpperCase() + k.slice(1)}</span>)}</div>
            {f.star.tips.length > 0 && <ul className="space-y-1 text-sm text-slate-300">{f.star.tips.map((t) => <li key={t}>• {t}</li>)}</ul>}
            {f.ai && <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.05] p-4 text-sm whitespace-pre-wrap text-slate-200"><p className="mb-1 text-xs uppercase tracking-wider text-cyan-300">AI coach</p>{f.ai}</div>}
            <p className="text-xs text-slate-500">The STAR check looks for structure cues in your wording. It&apos;s a practice aid, not a grade.</p>
          </div>
        )}
      </div>
    </div>
  );
}
