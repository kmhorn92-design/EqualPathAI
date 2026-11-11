"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import type { Template } from "@/lib/resume/templates";
import type { ResumeData } from "@/lib/resume/types";
import { ResumePreview } from "../resume/ResumePreview";
import { cx } from "../ui";

export function TemplateGallery({ templates, sample, signedIn }: { templates: Template[]; sample: ResumeData; signedIn: boolean }) {
  const [sel, setSel] = useState(templates[0].id);
  const t = templates.find((x) => x.id === sel)!;
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2" role="listbox" aria-label="Templates">{templates.map((x) => (
        <button key={x.id} role="option" aria-selected={sel === x.id} onClick={() => setSel(x.id)} className={cx("glass flex w-full items-center gap-3 p-3 text-left transition", sel === x.id ? "border-violet-400/50 bg-violet-500/10" : "hover:border-white/20")}>
          <span className="h-8 w-1.5 rounded-full" style={{ background: x.accent }} /><span className="flex-1"><span className="block text-sm font-medium">{x.name}</span><span className="text-xs text-slate-500">{x.industry} · {x.font}</span></span>
        </button>))}</div>
      <div className="space-y-4">
        <div className="glass p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{t.name}</h2><p className="text-sm text-slate-400">{t.industry} · section order: {t.sectionOrder.join(" → ")}</p></div>
            <Link href={signedIn ? "/resume" : "/signup"} className="btn-primary">Use with my resume<ArrowRight size={16} /></Link></div>
          <h3 className="mb-2 mt-4 text-xs uppercase tracking-wider text-slate-400">Content guidance</h3>
          <ul className="space-y-1.5 text-sm text-slate-300">{t.guidance.map((g) => <li key={g} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-cyan-300" />{g}</li>)}</ul>
          <p className="mt-3 text-xs text-slate-500">ATS-safe: one column, standard headings, real text (no images or text boxes), no tables or columns in exports. Pick your template in Resume Studio → Preview, where you can change it any time.</p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] p-4"><p className="mb-2 text-xs text-amber-200">Preview uses fictional DEMO content</p><ResumePreview data={sample} templateId={t.id} /></div>
      </div>
    </div>
  );
}
