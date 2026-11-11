"use client";
import { useEffect, useRef, useState } from "react";
import { Check, X, Timer, RotateCcw, Loader2 } from "lucide-react";
import { Progress, cx, ErrorBox } from "../ui";

type Q = { id: string; q: string; options: string[] };
type Result = { score: number; total: number; results: { id: string; chosen: number; correct: number; ok: boolean; why: string }[] };

export function Quiz({ module, questions }: { module: string; questions: Q[] }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const start = useRef(Date.now());
  useEffect(() => { if (result) return; const t = setInterval(() => setSecs(Math.floor((Date.now() - start.current) / 1000)), 1000); return () => clearInterval(t); }, [result]);

  async function submit() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/assessments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "mcq", module, answers, durationSec: secs }) });
    setBusy(false);
    if (!r.ok) return setErr("Could not submit. Please try again.");
    setResult(await r.json());
  }
  const reset = () => { setAnswers({}); setResult(null); setI(0); start.current = Date.now(); setSecs(0); };

  if (result) return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div><p className="text-sm text-slate-400">Your score</p><p className="font-display text-4xl font-semibold">{result.score}<span className="text-slate-500">/{result.total}</span></p><p className="text-xs text-slate-500">{Math.floor(secs / 60)}m {secs % 60}s · practice only, not an employer assessment</p></div>
        <button className="btn-ghost" onClick={reset}><RotateCcw size={16} />Try again</button>
      </div>
      {questions.map((q, n) => { const r = result.results.find((x) => x.id === q.id)!; return (
        <div key={q.id} className={cx("glass p-5", r.ok ? "border-emerald-400/25" : "border-rose-400/25")}>
          <p className="font-medium"><span className="text-slate-500">{n + 1}.</span> {q.q}</p>
          <ul className="mt-3 space-y-1.5">{q.options.map((o, k) => (
            <li key={k} className={cx("flex items-center gap-2 rounded-lg px-3 py-2 text-sm", k === r.correct ? "bg-emerald-500/10 text-emerald-100" : k === r.chosen ? "bg-rose-500/10 text-rose-100" : "text-slate-400")}>
              {k === r.correct ? <Check size={14} /> : k === r.chosen ? <X size={14} /> : <span className="w-3.5" />}{o}</li>))}</ul>
          <p className="mt-3 text-sm text-slate-300"><b className="text-cyan-200">Why:</b> {r.why}</p>
        </div>); })}
    </div>
  );

  const q = questions[i];
  return (
    <div className="glass p-6">
      <div className="mb-5 flex items-center justify-between text-sm text-slate-400"><span>Question {i + 1} of {questions.length}</span><span className="flex items-center gap-1"><Timer size={14} />{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span></div>
      <Progress value={Object.keys(answers).length} max={questions.length} />
      <fieldset className="mt-6" key={q.id}>
        <legend className="text-lg font-medium">{q.q}</legend>
        <div className="mt-4 grid gap-2">{q.options.map((o, k) => (
          <label key={k} className={cx("flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition", answers[q.id] === k ? "border-violet-400/60 bg-violet-500/15" : "border-white/10 hover:border-white/25")}>
            <input type="radio" name={q.id} className="accent-violet-500" checked={answers[q.id] === k} onChange={() => setAnswers((a) => ({ ...a, [q.id]: k }))} />{o}</label>))}</div>
      </fieldset>
      {err && <div className="mt-4"><ErrorBox>{err}</ErrorBox></div>}
      <div className="mt-6 flex justify-between">
        <button className="btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
        {i < questions.length - 1 ? <button className="btn-primary" onClick={() => setI(i + 1)} disabled={answers[q.id] === undefined}>Next</button>
          : <button className="btn-primary" onClick={submit} disabled={busy || Object.keys(answers).length < questions.length}>{busy && <Loader2 size={16} className="animate-spin" />}Submit & see explanations</button>}
      </div>
    </div>
  );
}
