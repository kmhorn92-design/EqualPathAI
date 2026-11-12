"use client";
import { useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, MapPin, Clock, ShieldCheck, Sparkles, Loader2, Plus, AlertTriangle, Wand2 } from "lucide-react";
import { cx, DemoBadge } from "../ui";

export type JobRow = {
  id: string; sourceId: string; company: string; title: string; location: string; workMode: string; employmentType: string | null; industry: string | null;
  experienceLevel: string | null; salaryMin: number | null; salaryMax: number | null; salaryCurrency: string | null; salaryPeriod: string | null;
  applyUrl: string; attribution: string | null; postedAt: string | null; lastVerifiedAt: string; status: string; isDemo: boolean; snippet: string; saved: boolean;
};
const ago = (d: string | null) => { if (!d) return "unknown"; const h = (Date.now() - new Date(d).getTime()) / 36e5; return h < 1 ? "just now" : h < 24 ? `${Math.floor(h)}h ago` : `${Math.floor(h / 24)}d ago`; };
const money = (n: number, c: string | null) => new Intl.NumberFormat("en-US", { style: "currency", currency: c ?? "USD", maximumFractionDigits: 0 }).format(n);

export function JobCard({ job, signedIn }: { job: JobRow; signedIn: boolean }) {
  const [saved, setSaved] = useState(job.saved);
  const [match, setMatch] = useState<{ reasons: string[]; overlap: string[]; gaps: string[]; disclaimer: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tracked, setTracked] = useState(false);
  const toggle = async () => {
    if (!signedIn) { location.href = "/login"; return; }
    setSaved(!saved);
    const r = await fetch(`/api/jobs/${job.id}/save`, { method: saved ? "DELETE" : "POST" });
    if (!r.ok) setSaved(saved);
  };
  const why = async () => {
    if (match) { setMatch(null); return; }
    setLoading(true); const r = await fetch(`/api/jobs/${job.id}/match`); setLoading(false);
    if (r.ok) setMatch(await r.json());
  };
  const track = async () => {
    const r = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId: job.id, company: job.company, title: job.title, url: job.applyUrl, status: "SAVED" }) });
    if (r.ok) setTracked(true);
  };
  const salary = job.salaryMin || job.salaryMax ? `${job.salaryMin ? money(job.salaryMin, job.salaryCurrency) : ""}${job.salaryMax && job.salaryMax !== job.salaryMin ? `–${money(job.salaryMax, job.salaryCurrency)}` : ""}${job.salaryPeriod ? ` / ${job.salaryPeriod}` : ""}` : null;
  const stale = job.status === "STALE";
  return (
    <article className={cx("glass glass-hover p-5", job.isDemo && "border-amber-400/20")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">{job.isDemo && <DemoBadge />}{stale && <span className="chip-amber"><AlertTriangle size={11} />Not re-verified recently</span>}
            <h3 className="text-lg font-semibold leading-tight">{job.title}</h3></div>
          <p className="mt-1 text-sm text-slate-300">{job.company}</p>
        </div>
        <button onClick={toggle} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-cyan-300" aria-label={saved ? "Unsave job" : "Save job"} aria-pressed={saved}>{saved ? <BookmarkCheck size={19} className="text-cyan-300" /> : <Bookmark size={19} />}</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        <span className="chip"><MapPin size={11} />{job.location}</span>
        {job.workMode !== "UNKNOWN" && <span className="chip-violet">{job.workMode === "ONSITE" ? "On-site" : job.workMode[0] + job.workMode.slice(1).toLowerCase()}</span>}
        {job.employmentType && <span className="chip">{job.employmentType}</span>}
        {job.experienceLevel && <span className="chip">{job.experienceLevel}</span>}
        {salary ? <span className="chip-green">{salary}</span> : <span className="chip text-slate-500">Salary not disclosed</span>}
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-slate-400">{job.snippet}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><Clock size={11} />Posted {ago(job.postedAt)}</span>
        <span className="flex items-center gap-1"><ShieldCheck size={11} />Verified {ago(job.lastVerifiedAt)}</span>
        <span>Source: {job.attribution ?? job.sourceId}</span>
      </div>
      {match && (
        <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.05] p-3 text-sm">
          <ul className="space-y-1 text-slate-200">{match.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
          <p className="mt-2 text-xs text-slate-500">{match.disclaimer}</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-primary py-2">Apply on employer site<ExternalLink size={14} /></a>
        <a href={signedIn ? `/resume/tailor?job=${job.id}` : "/login"} className="btn-ghost border-violet-400/40 py-2 text-violet-100"><Wand2 size={14} />Tailor my resume</a>
        {signedIn && <button onClick={why} className="btn-ghost py-2">{loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}{match ? "Hide" : "Why this matches"}</button>}
        {signedIn && <button onClick={track} disabled={tracked} className="btn-ghost py-2"><Plus size={14} />{tracked ? "In tracker" : "Track"}</button>}
      </div>
    </article>
  );
}
