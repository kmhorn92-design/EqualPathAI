"use client";
import { useState } from "react";
import { X } from "lucide-react";

export function TagInput({ id, value, onChange, suggestions = [], placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = (t: string) => { const s = t.trim(); if (s && !value.some((v) => v.toLowerCase() === s.toLowerCase())) onChange([...value, s]); setDraft(""); };
  return (
    <div>
      <div className="input flex min-h-[46px] flex-wrap items-center gap-1.5 py-2">
        {value.map((t) => (
          <span key={t} className="chip-violet">{t}<button type="button" className="-my-2 -mr-2 ml-0.5 grid h-8 w-8 place-items-center rounded-full hover:bg-white/10" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}><X size={13} /></button></span>
        ))}
        <input id={id} value={draft} placeholder={value.length ? "" : placeholder} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1)); }}
          onBlur={() => draft && add(draft)} className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500" />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">{suggestions.filter((s) => !value.includes(s)).slice(0, 12).map((s) => (
          <button type="button" key={s} onClick={() => add(s)} className="chip min-h-[32px] hover:border-violet-400/40 hover:text-white">+ {s}</button>
        ))}</div>
      )}
    </div>
  );
}
