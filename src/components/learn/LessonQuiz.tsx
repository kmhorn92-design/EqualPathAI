"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, X, Loader2, Award } from "lucide-react";
import { cx } from "../ui";

export function LessonQuiz({ lessonId, quiz, signedIn }: { lessonId: string; quiz: { q: string; options: string[] }[]; signedIn: boolean }) {
  const [a, setA] = useState<number[]>(quiz.map(() => -1));
  const [res, setRes] = useState<{ score: number; total: number; completed: boolean; results: { ok: boolean; correct: number; why: string }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    const r = await fetch(`/api/lessons/${lessonId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: a }) });
    setBusy(false); if (r.ok) setRes(await r.json());
  }
  if (!signedIn) return <p className="text-sm text-slate-400"><Link href="/signup" className="text-cyan-300 underline">Create a free account</Link> to take the quiz and track progress.</p>;
  return (
    <div className="space-y-4">
      {quiz.map((q, i) => (
        <fieldset key={i} className="rounded-xl border border-white/[0.07] p-4">
          <legend className="px-1 text-sm font-medium">{i + 1}. {q.q}</legend>
          <div className="mt-2 grid gap-1.5">{q.options.map((o, k) => {
            const r = res?.results[i];
            return (
              <label key={k} className={cx("flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm", r ? (k === r.correct ? "bg-emerald-500/10 text-emerald-100" : k === a[i] ? "bg-rose-500/10 text-rose-100" : "text-slate-400") : a[i] === k ? "bg-violet-500/15" : "hover:bg-white/5")}>
                <input type="radio" name={`q${i}`} disabled={!!res} checked={a[i] === k} onChange={() => setA((x) => x.map((v, j) => (j === i ? k : v)))} className="accent-violet-500" />{o}
                {r && k === r.correct && <Check size={14} className="ml-auto" />}{r && k === a[i] && k !== r.correct && <X size={14} className="ml-auto" />}
              </label>);
          })}</div>
          {res && <p className="mt-2 text-xs text-slate-300">{res.results[i].why}</p>}
        </fieldset>
      ))}
      {res ? (
        <div className={cx("flex items-center gap-3 rounded-xl p-4", res.completed ? "bg-emerald-500/10 text-emerald-100" : "bg-amber-500/10 text-amber-100")}>
          <Award size={20} /><span>{res.score}/{res.total} correct. {res.completed ? "Lesson complete!" : "Review the explanations and try again."}</span>
          {!res.completed && <button className="btn-ghost ml-auto py-1.5 text-xs" onClick={() => { setRes(null); setA(quiz.map(() => -1)); }}>Retry</button>}
        </div>
      ) : <button className="btn-primary" disabled={busy || a.includes(-1)} onClick={check}>{busy && <Loader2 size={16} className="animate-spin" />}Check answers</button>}
    </div>
  );
}
