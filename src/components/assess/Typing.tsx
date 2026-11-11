"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cx } from "../ui";

export function Typing({ passages }: { passages: string[] }) {
  const [p, setP] = useState(0);
  const [typed, setTyped] = useState("");
  const [startAt, setStartAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState<{ wpm: number; accuracy: number } | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const target = passages[p];
  useEffect(() => { if (!startAt || done) return; const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, [startAt, done]);
  const secs = startAt ? (now - startAt) / 1000 : 0;
  const correct = [...typed].filter((c, i) => c === target[i]).length;
  const liveWpm = secs > 1 ? Math.round(correct / 5 / (secs / 60)) : 0;

  async function finish(text: string) {
    const durationSec = Math.max(1, Math.round((Date.now() - (startAt ?? Date.now())) / 1000));
    const r = await fetch("/api/assessments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "typing", module: "typing", passage: p, typed: text, durationSec }) });
    if (r.ok) setDone(await r.json());
  }
  const reset = (next = p) => { setP(next); setTyped(""); setStartAt(null); setDone(null); setTimeout(() => ref.current?.focus(), 0); };

  return (
    <div className="glass p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex gap-1">{passages.map((_, i) => <button key={i} onClick={() => reset(i)} className={cx("rounded-lg px-3 py-1", i === p ? "bg-white/10" : "text-slate-400")}>Passage {i + 1}</button>)}</div>
        <div className="flex gap-4 font-mono text-slate-300" aria-live="polite"><span>{liveWpm} WPM</span><span>{Math.floor(secs)}s</span></div>
      </div>
      <p className="select-none rounded-xl bg-ink-900/70 p-4 font-mono text-[15px] leading-relaxed" aria-label="Text to type">
        {[...target].map((c, i) => <span key={i} className={i < typed.length ? (typed[i] === c ? "text-emerald-300" : "bg-rose-500/30 text-rose-200") : i === typed.length ? "border-b-2 border-cyan-300 text-white" : "text-slate-500"}>{c}</span>)}
      </p>
      {done ? (
        <div className="mt-5 flex flex-wrap items-center gap-6"><div><p className="text-sm text-slate-400">Speed</p><p className="font-display text-3xl">{done.wpm} WPM</p></div><div><p className="text-sm text-slate-400">Accuracy</p><p className="font-display text-3xl">{done.accuracy}%</p></div><button className="btn-ghost" onClick={() => reset()}><RotateCcw size={16} />Again</button></div>
      ) : (
        <textarea ref={ref} aria-label="Type the passage here" className="input mt-4 min-h-[110px] font-mono" value={typed} spellCheck={false} autoComplete="off"
          onPaste={(e) => e.preventDefault()}
          onChange={(e) => { const v = e.target.value.slice(0, target.length); if (!startAt) setStartAt(Date.now()); setTyped(v); if (v.length >= target.length) finish(v); }} placeholder="Start typing to begin the timer…" />
      )}
      <p className="mt-3 text-xs text-slate-500">Pasting is disabled to keep practice results meaningful.</p>
    </div>
  );
}
