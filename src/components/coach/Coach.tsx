"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Plus, Trash2, Bot, User } from "lucide-react";
import { cx, ErrorBox } from "../ui";

type Msg = { role: "user" | "assistant"; content: string };
type Thread = { id: string; topic: string; updatedAt: string };
const STARTERS: Record<string, string[]> = {
  roadmap: ["Make me a 90-day plan to become a medical billing specialist", "I'm switching from retail to IT support. Where do I start?"],
  transferable: ["I was a stay-at-home parent for 6 years. What skills can I list?", "What from food service transfers to an office job?"],
  salary: ["How do I research pay for a data analyst in Atlanta?", "How should I respond when asked my salary expectations?"],
  interview: ["What questions should I expect for a customer service role?", "How do I prepare for a video interview?"],
  star: ["Give me a behavioral question to practice", "Practice a 'tell me about a mistake' question"],
  cover: ["Help me write a cover letter for an admin assistant job", "How do I explain an employment gap honestly?"],
  networking: ["Write a message asking for an informational interview", "I don't know anyone in tech. How do I start?"],
};

/** Minimal safe renderer: headings, bullets, numbered lists, **bold**, *italic*, links. No raw HTML. */
function Inline({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|https?:\/\/[^\s)]+)/g).map((seg, k) =>
    /^\*\*.+\*\*$/.test(seg) ? <b key={k} className="text-white">{seg.slice(2, -2)}</b>
      : /^(\*[^*].*\*|_.+_)$/.test(seg) ? <i key={k}>{seg.slice(1, -1)}</i>
      : /^https?:\/\//.test(seg) ? <a key={k} href={seg} target="_blank" rel="noopener noreferrer" className="break-all text-cyan-300 underline">{seg}</a> : seg)}</>;
}
function Rich({ text }: { text: string }) {
  return <>{text.split("\n").map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    const h = t.match(/^#{1,6}\s+(.*)$/); if (h) return <p key={i} className="mb-1.5 mt-2 font-semibold text-white"><Inline text={h[1].replace(/\*\*/g, "")} /></p>;
    const b = t.match(/^[-*•]\s+(.*)$/); if (b) return <p key={i} className="mb-1 flex gap-2 pl-1"><span className="text-violet-300">•</span><span className="min-w-0 flex-1"><Inline text={b[1]} /></span></p>;
    const n = t.match(/^(\d+)[.)]\s+(.*)$/); if (n) return <p key={i} className="mb-1 flex gap-2 pl-1"><span className="text-violet-300">{n[1]}.</span><span className="min-w-0 flex-1"><Inline text={n[2]} /></span></p>;
    return <p key={i} className="mb-1.5"><Inline text={t} /></p>;
  })}</>;
}

export function Coach({ topics, initialThreads }: { topics: { id: string; label: string }[]; initialThreads: Thread[] }) {
  const [topic, setTopic] = useState(topics[0].id);
  const [threads, setThreads] = useState(initialThreads);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // Scroll only the message list (not the whole page) so new replies are fully visible.
  useEffect(() => { const el = scroller.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  async function open(t: Thread) {
    setThreadId(t.id); setTopic(t.topic); setErr(null);
    const r = await fetch(`/api/coach?threadId=${t.id}`); if (r.ok) setMsgs((await r.json()).messages);
  }
  const fresh = (tp = topic) => { setThreadId(null); setMsgs([]); setTopic(tp); };
  async function send(text = input) {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { role: "user", content: text }]); setInput(""); setBusy(true); setErr(null);
    const r = await fetch("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ threadId: threadId ?? undefined, topic, message: text }) });
    const d = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(d.error ?? "The coach is unavailable right now."); return; }
    setMsgs((m) => [...m, { role: "assistant", content: d.reply }]);
    if (!threadId) { setThreadId(d.threadId); setThreads((t) => [{ id: d.threadId, topic, updatedAt: new Date().toISOString() }, ...t]); }
  }
  async function del(id: string) { await fetch(`/api/coach?threadId=${id}`, { method: "DELETE" }); setThreads((t) => t.filter((x) => x.id !== id)); if (id === threadId) fresh(); }
  const label = (id: string) => topics.find((t) => t.id === id)?.label ?? id;

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="glass p-2" role="tablist" aria-label="Coaching topics">{topics.map((t) => (
          <button key={t.id} role="tab" aria-selected={topic === t.id && !threadId} onClick={() => fresh(t.id)} className={cx("block w-full rounded-lg px-3 py-2 text-left text-sm", topic === t.id && !threadId ? "bg-gradient-to-r from-violet-500/20 to-transparent text-white" : "text-slate-400 hover:bg-white/5")}>{t.label}</button>))}</div>
        {threads.length > 0 && <div className="glass p-2"><p className="px-2 py-1 text-xs uppercase tracking-wider text-slate-500">History (encrypted)</p>{threads.map((t) => (
          <div key={t.id} className="group flex items-center"><button onClick={() => open(t)} className={cx("flex-1 truncate rounded-lg px-3 py-2 text-left text-sm", threadId === t.id ? "bg-white/10" : "text-slate-400 hover:bg-white/5")}>{label(t.topic)} · {new Date(t.updatedAt).toLocaleDateString()}</button>
            <button onClick={() => del(t.id)} className="p-1.5 text-slate-600 opacity-0 hover:text-rose-300 group-hover:opacity-100 focus:opacity-100" aria-label="Delete conversation"><Trash2 size={13} /></button></div>))}</div>}
      </aside>
      <section className="glass flex h-[calc(100dvh-9rem)] min-h-[480px] min-w-0 flex-col overflow-hidden" aria-label="Coach conversation">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3"><h2 className="font-semibold">{label(topic)}</h2><button className="btn-ghost py-1.5 text-xs" onClick={() => fresh()}><Plus size={13} />New</button></div>
        <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
          {msgs.length === 0 && <div className="py-10 text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20"><Bot className="text-cyan-200" /></div><p className="text-slate-300">How can I help with {label(topic).toLowerCase()}?</p>
            <div className="mx-auto mt-5 flex max-w-lg flex-col gap-2">{(STARTERS[topic] ?? []).map((s) => <button key={s} onClick={() => send(s)} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-left text-sm text-slate-300 hover:border-violet-400/40">{s}</button>)}</div></div>}
          {msgs.map((m, i) => (
            <div key={i} className={cx("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <div className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full", m.role === "user" ? "bg-white/10" : "bg-gradient-to-br from-violet-500 to-cyan-500")}>{m.role === "user" ? <User size={15} /> : <Bot size={15} />}</div>
              <div className={cx("min-w-0 max-w-[85%] break-words rounded-2xl px-4 py-3 text-sm leading-relaxed [overflow-wrap:anywhere]", m.role === "user" ? "whitespace-pre-wrap bg-violet-500/20 text-white" : "bg-white/[0.04] text-slate-200")}>{m.role === "assistant" ? <Rich text={m.content} /> : m.content}</div>
            </div>))}
          {busy && <div className="flex gap-3"><div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500"><Loader2 size={15} className="animate-spin" /></div><div className="skeleton h-10 w-48" /></div>}
          <div ref={end} />
        </div>
        {err && <div className="px-5"><ErrorBox>{err}</ErrorBox></div>}
        <form className="flex shrink-0 gap-2 border-t border-white/5 p-4" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <textarea aria-label="Message the coach" className="input min-h-[46px] flex-1 resize-none" rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask anything about your career…" />
          <button className="btn-primary px-4" disabled={busy || !input.trim()} aria-label="Send"><Send size={16} /></button>
        </form>
        <p className="px-4 pb-3 text-[11px] text-slate-500">The AI can make mistakes. Check facts, salaries, and legal information with official sources. Not legal or financial advice.</p>
      </section>
    </div>
  );
}
