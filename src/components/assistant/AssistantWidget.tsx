"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, X, Send, Loader2, Sparkles, ArrowRight, Bot } from "lucide-react";
import { SUGGESTED_QUESTIONS } from "@/content/site-guide";
import type { AssistantReply } from "@/lib/assistant";

type Msg = { role: "user" | "assistant"; content: string; links?: { href: string; label: string }[] };

/**
 * Floating site-help assistant. `ask` is injected so the same UI works in the app (server API)
 * and in the static demo (local help-guide retrieval).
 */
export function AssistantWidget({ ask, onNavigate, note }: { ask: (m: { role: "user" | "assistant"; content: string }[]) => Promise<AssistantReply>; onNavigate?: (href: string) => void; note: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, busy]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, []);

  async function send(text: string) {
    const q = text.trim(); if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await ask(next.map(({ role, content }) => ({ role, content })));
      setMsgs([...next, { role: "assistant", content: r.answer, links: r.links }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Sorry, I couldn't answer just now. Please try again in a moment." }]);
    }
    setBusy(false);
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="ep-assistant" aria-label={open ? "Close help assistant" : "Open help assistant"}
        className="fixed bottom-5 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-[0_10px_40px_-8px_rgba(139,92,246,.9)] transition hover:scale-105">
        {open ? <X size={22} /> : <MessageCircleQuestion size={24} />}
        {!open && msgs.length === 0 && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink bg-cyan-300 animate-pulseglow" />}
      </button>
      {open && (
        <section id="ep-assistant" role="dialog" aria-label="EqualPath help assistant"
          className="fixed bottom-24 right-3 z-[60] flex max-h-[min(640px,calc(100vh-8rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-800/95 shadow-2xl backdrop-blur-xl sm:right-5">
          <header className="flex items-center gap-3 border-b border-white/5 bg-gradient-to-r from-violet-500/15 to-cyan-500/10 px-4 py-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500"><Bot size={18} /></div>
            <div className="flex-1"><h2 className="text-sm font-semibold">EqualPath Assistant</h2><p className="text-[11px] text-slate-400">Questions about using the site</p></div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5" aria-label="Close"><X size={16} /></button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            <div className="rounded-2xl rounded-tl-sm bg-white/[0.05] px-3.5 py-2.5 text-sm text-slate-200">Hi! I can help you find your way around EqualPath: resumes, jobs, coaches, recruiters, practice tests and privacy. What would you like to know?</div>
            {msgs.length === 0 && <div className="flex flex-wrap gap-1.5">{SUGGESTED_QUESTIONS.map((q) => (
              <button key={q} onClick={() => send(q)} className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-left text-xs text-violet-100 hover:border-violet-400/60">{q}</button>))}</div>}
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-violet-500/25 px-3.5 py-2.5 text-sm text-white">{m.content}</div>
            ) : (
              <div key={i} className="max-w-[92%]">
                <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white/[0.05] px-3.5 py-2.5 text-sm leading-relaxed text-slate-200">{m.content}</div>
                {m.links && m.links.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{m.links.map((l) => (
                  <a key={l.href} href={l.href} onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate(l.href); setOpen(false); } }}
                    className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100 hover:border-cyan-300/60">{l.label}<ArrowRight size={11} /></a>))}</div>}
              </div>))}
            {busy && <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" />Thinking…</div>}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-white/5 p-3">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} aria-label="Ask a question about EqualPath" placeholder="Ask about EqualPath…" className="input py-2" />
            <button className="btn-primary px-3" disabled={!input.trim() || busy} aria-label="Send"><Send size={15} /></button>
          </form>
          <p className="flex items-center gap-1 px-4 pb-3 text-[10px] text-slate-500"><Sparkles size={10} />{note}</p>
        </section>
      )}
    </>
  );
}
