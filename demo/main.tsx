/**
 * EqualPath AI — interactive browser demo.
 * Runs the app's REAL client-safe modules (parser, analysis, fabrication guard, templates,
 * job matching, grading, lessons). Server-only features (accounts, encryption, database,
 * live job feeds, LLM) are represented with clearly labeled DEMO data held in memory.
 */
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight, Check, X, Wand2, FileText, Briefcase, KanbanSquare, ClipboardCheck, GraduationCap, Scale, Home, ShieldCheck,
  AlertTriangle, Columns2, Users, Handshake, Globe, Shuffle, Building2, LayoutGrid, Upload, Sparkles, MapPin, Clock, Bookmark, BookmarkCheck, ExternalLink, Info, Plus, Lightbulb, Copy, RotateCcw, Award,
} from "lucide-react";
import { structureText, resumeCorpus } from "@/lib/resume/parse";
import { analyzeAgainstJob, ruleSuggestions, applySuggestions, guardSuggestion } from "@/lib/resume/analyze";
import { LEXICON } from "@/lib/resume/lexicon";
import { TEMPLATES } from "@/lib/resume/templates";
import type { KeywordAnalysis, ResumeData, Suggestion } from "@/lib/resume/types";
import { demoJobs } from "@/lib/jobs/adapters/demo";
import { validateJob, dedupe } from "@/lib/jobs/normalize";
import { explainMatch } from "@/lib/jobs/match";
import { gradeMcq, starCheck } from "@/lib/grading";
import { followUp } from "@/lib/followups";
import { MODULES } from "@/content/assessments";
import { LESSONS } from "@/content/lessons";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { Card, Notice, Progress, DemoBadge, cx, Empty } from "@/components/ui";
import { Landing } from "./landing";
import { Coaches, COACHES, type Booking, type Arrangement } from "./coaches";
import { Partners, PARTNERS } from "./partners";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { guideAnswer } from "@/lib/assistant";

const SAMPLE_RESUME = `Jordan Rivera (DEMO)
Baltimore, MD | (410) 555-0134 | jordan.demo@example.com | linkedin.com/in/demo

SUMMARY
Customer service professional with experience in retail and call center environments.

EXPERIENCE
Customer Service Representative | BrightCall Solutions | Baltimore, MD   Mar 2021 - Present
• Responsible for handling 60 inbound calls per day using Zendesk
• Helped with training new hires on de-escalation and call scripts
• Responsible for scheduling appointments and maintaining customer records

Sales Associate | Harbor Outfitters | Towson, MD   Jun 2018 - Feb 2021
• Worked on cash handling and opening/closing procedures
• Assisted customers in English and Spanish

EDUCATION
Community College of Baltimore County
Associate of Arts, Business Administration 2020

SKILLS
Customer Service, Zendesk, Microsoft Office`;

const SAMPLE_JD = `Customer Service Representative (Remote)
We are hiring a Customer Service Representative to support our members.
Requirements:
- 2+ years customer service experience
- Experience with CRM tools such as Zendesk or Salesforce required
- Strong conflict resolution skills
- Data entry and scheduling
- Must be proficient in Microsoft Office
Preferred: Bilingual (Spanish), HIPAA knowledge.`;

type View = "home" | "studio" | "jobs" | "partners" | "coaches" | "tracker" | "practice" | "learn" | "fair";
const NAV: { id: View; label: string; icon: typeof Home; short?: string }[] = [
  { id: "home", label: "Home", icon: Home }, { id: "studio", label: "Resume Studio", short: "Resume", icon: FileText }, { id: "jobs", label: "Job Board", icon: Briefcase }, { id: "partners", label: "Hiring Partners", short: "Partners", icon: Handshake }, { id: "coaches", label: "Career Coaches", short: "Coaches", icon: Users },
  { id: "tracker", label: "Applications", icon: KanbanSquare }, { id: "practice", label: "Assessment Academy", short: "Practice", icon: ClipboardCheck },
  { id: "learn", label: "Learning Hub", short: "Learn", icon: GraduationCap }, { id: "fair", label: "Fair Hiring", icon: Scale },
];

type Job = ReturnType<typeof demoJobs>[number] & { id: string; lastVerifiedAt: Date };
type App = { id: string; company: string; title: string; status: string; appliedAt: string | null; updatedAt: string };

/* ---------------- shell ---------------- */
function useHashView(): [View, (v: View) => void] {
  const read = () => (NAV.some((n) => n.id === location.hash.slice(1)) ? (location.hash.slice(1) as View) : "home");
  const [v, setV] = useState<View>(read);
  useEffect(() => { const h = () => setV(read()); addEventListener("hashchange", h); return () => removeEventListener("hashchange", h); }, []);
  return [v, (x) => { location.hash = x; setV(x); window.scrollTo(0, 0); }];
}

function Mark() {
  return (
    <svg width={30} height={30} viewBox="0 0 40 40" aria-hidden="true">
      <defs><linearGradient id="demo-lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8B5CF6" /><stop offset="1" stopColor="#22D3EE" /></linearGradient></defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#121827" stroke="url(#demo-lg)" strokeWidth="1.5" />
      <path d="M11 26 L20 12 L29 26" fill="none" stroke="url(#demo-lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 21 H25.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /><circle cx="20" cy="12" r="2.4" fill="#22D3EE" />
    </svg>
  );
}

function DemoApp() {
  const [view, go] = useHashView();
  const jobs = useMemo<Job[]>(() => {
    // Same validation + dedupe pipeline the real ingestion uses.
    const valid = demoJobs(24).map((j) => validateJob(j)).filter((v) => v.ok).map((v) => (v as { job: ReturnType<typeof demoJobs>[number] }).job);
    return dedupe(valid).jobs.map((j, i) => ({ ...j, id: `j${i}`, lastVerifiedAt: new Date(Date.now() - (i % 5) * 36e5) }));
  }, []);
  const [resume, setResume] = useState<ResumeData>(() => structureText(SAMPLE_RESUME));
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [coachArr, setCoachArr] = useState<Arrangement | undefined>();
  const toCoaches = (a?: Arrangement) => { setCoachArr(a); go("coaches"); };
  const [jobQ, setJobQ] = useState("");
  const toJobs = (q = "") => { setJobQ(q); go("jobs"); };
  // Map full-app routes in assistant answers onto demo views.
  const routeToView = (href: string): View => {
    const h = href.replace(/#.*$/, "");
    if (h.startsWith("/resume") || h.startsWith("/templates")) return "studio";
    if (h.startsWith("/jobs")) return "jobs";
    if (h.startsWith("/partners")) return "partners";
    if (h.startsWith("/coaches") || h.startsWith("/sessions")) return "coaches";
    if (h.startsWith("/tracker")) return "tracker";
    if (h.startsWith("/assessments")) return "practice";
    if (h.startsWith("/learn")) return "learn";
    if (h.startsWith("/fair-hiring")) return "fair";
    return "home";
  };
  const [apps, setApps] = useState<App[]>([
    { id: "a1", company: "DEMO Northwind Health", title: "Patient Access Representative", status: "APPLIED", appliedAt: new Date(Date.now() - 9 * 864e5).toISOString(), updatedAt: new Date().toISOString() },
    { id: "a2", company: "DEMO Contoso Labs", title: "Support Specialist", status: "INTERVIEWING", appliedAt: new Date(Date.now() - 14 * 864e5).toISOString(), updatedAt: new Date().toISOString() },
  ]);
  const track = (j: Job) => setApps((a) => a.some((x) => x.title === j.title && x.company === j.company) ? a : [{ id: `a${Date.now()}`, company: j.company, title: j.title.replace("[DEMO] ", ""), status: "SAVED", appliedAt: null, updatedAt: new Date().toISOString() }, ...a]);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="pointer-events-none fixed -top-40 left-1/3 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button onClick={() => go("home")} className="flex shrink-0 items-center gap-2" aria-label="EqualPath AI home"><Mark /><span className="hidden whitespace-nowrap font-display text-lg font-semibold sm:inline">EqualPath <span className="gradient-text">AI</span></span></button>
          <span className="chip-amber hidden whitespace-nowrap 2xl:inline-flex">Interactive demo · sample data</span>
          <nav aria-label="Main" className="ml-auto flex gap-1 overflow-x-auto">
            {NAV.slice(1).map(({ id, label, short, icon: Icon }) => (
              <button key={id} onClick={() => go(id)} aria-current={view === id ? "page" : undefined} aria-label={label} title={label}
                className={cx("flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition", view === id ? "bg-gradient-to-r from-violet-500/25 to-cyan-500/10 text-white ring-1 ring-violet-400/30" : "text-slate-400 hover:text-white")}>
                <Icon size={15} /><span className="hidden whitespace-nowrap xl:inline">{short ?? label}</span>
              </button>))}
          </nav>
        </div>
      </header>
      {view === "home" && <main id="main" className="relative"><Landing onEnter={(to) => go(to ?? "studio")} onCoaches={toCoaches} onPartners={() => go("partners")} partners={PARTNERS.map((x) => ({ name: x.name, industry: x.industry, color: x.color, recruiters: x.recruiters.length }))} /></main>}
      {view !== "home" && <main id="main" className="relative mx-auto max-w-7xl px-4 py-8">
        {view === "studio" && <Studio resume={resume} setResume={setResume} />}
        {view === "partners" && <Partners jobs={jobs} goJobs={(c) => toJobs(c)} />}
        {view === "jobs" && <Jobs key={jobQ} initialQuery={jobQ} jobs={jobs} resume={resume} saved={saved} setSaved={setSaved} track={track} toCoaches={toCoaches} />}
        {view === "coaches" && <Coaches key={coachArr ?? "ALL"} initial={coachArr} bookings={bookings} setBookings={setBookings} />}
        {view === "tracker" && <Tracker apps={apps} setApps={setApps} />}
        {view === "practice" && <Practice />}
        {view === "learn" && <Learn />}
        {view === "fair" && <Fair />}
      </main>}
      <AssistantWidget ask={async (m) => { await new Promise((r) => setTimeout(r, 350)); return guideAnswer(m[m.length - 1].content); }} onNavigate={(href) => go(routeToView(href))}
        note="Demo: answers come from the EqualPath help guide. The full app uses AI grounded in the same guide." />
      <footer className="relative border-t border-white/[0.06] py-6 text-center text-xs text-slate-500">
        Demo of the EqualPath AI codebase. Everything you enter stays in this browser tab, and nothing is sent anywhere.
      </footer>
    </div>
  );
}

function Head({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return <div className="mb-6 animate-fadeup"><p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{kicker}</p><h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>{sub && <p className="mt-2 max-w-3xl text-slate-400">{sub}</p>}</div>;
}

/* ---------------- resume studio ---------------- */
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function Highlight({ text, matched, missing }: { text: string; matched: string[]; missing: string[] }) {
  const parts = useMemo(() => {
    const terms: [string, "hit" | "miss"][] = [];
    for (const k of matched) for (const a of [k, ...(LEXICON[k] ?? [])]) terms.push([a, "hit"]);
    for (const k of missing) for (const a of [k, ...(LEXICON[k] ?? [])]) terms.push([a, "miss"]);
    terms.sort((a, b) => b[0].length - a[0].length);
    if (!terms.length) return [{ t: text }];
    const re = new RegExp(`(?<![A-Za-z0-9+#])(${terms.map(([a]) => esc(a)).join("|")})(?![A-Za-z0-9+#])`, "gi");
    const out: { t: string; k?: "hit" | "miss" }[] = []; let last = 0;
    for (const m of text.matchAll(re)) { out.push({ t: text.slice(last, m.index) }); out.push({ t: m[0], k: terms.find(([a]) => a.toLowerCase() === m[0].toLowerCase())?.[1] }); last = m.index! + m[0].length; }
    out.push({ t: text.slice(last) }); return out;
  }, [text, matched, missing]);
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{parts.map((p, i) => (p.k ? <mark key={i} className={p.k === "hit" ? "mark-hit" : "mark-miss"}>{p.t}</mark> : <span key={i}>{p.t}</span>))}</p>;
}
function changedKeys(a: ResumeData, b: ResumeData) {
  const s = new Set<string>();
  if (a.summary !== b.summary) s.add("summary");
  if (a.skills.join() !== b.skills.join()) s.add("skills");
  for (const e of b.experience) { const o = a.experience.find((x) => x.id === e.id); e.bullets.forEach((bl, i) => { if (!o || o.bullets[i] !== bl) s.add(`${e.id}:${i}`); }); }
  return s;
}

function Studio({ resume, setResume }: { resume: ResumeData; setResume: (r: ResumeData) => void }) {
  const [tab, setTab] = useState<"upload" | "edit" | "tailor" | "preview">("edit");
  const [raw, setRaw] = useState(SAMPLE_RESUME);
  const [jd, setJd] = useState(SAMPLE_JD);
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null);
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [versions, setVersions] = useState<{ label: string; content: ResumeData }[]>([{ label: "Original (as uploaded)", content: resume }]);
  const [sel, setSel] = useState(0);
  const [template, setTemplate] = useState("classic");
  const [compare, setCompare] = useState(false);
  const [guardIn, setGuardIn] = useState("Handled 120 calls per day using Zendesk and Salesforce, raising CSAT 30%");
  const upd = (fn: (d: ResumeData) => void) => { const n = structuredClone(resume); fn(n); setResume(n); };

  const parse = (text: string) => { const r = structureText(text); setResume(r); setVersions([{ label: "Original (as uploaded)", content: r }]); setSel(0); setAnalysis(null); setSugs([]); setTab("edit"); };
  const analyze = () => { const a = analyzeAgainstJob(resume, jd); setAnalysis(a); setSugs(ruleSuggestions(resume, a)); };
  const tailored = useMemo(() => applySuggestions(resume, sugs), [resume, sugs]);
  const accepted = sugs.filter((s) => s.status === "accepted").length;
  const guardResult = useMemo(() => guardSuggestion(resume.experience[0]?.bullets[0] ?? "", guardIn, resumeCorpus(resume)), [guardIn, resume]);

  const T = ({ id, n, label }: { id: typeof tab; n: number; label: string }) => (
    <button role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx("rounded-lg px-4 py-2 text-sm font-medium transition", tab === id ? "bg-white/10 text-white" : "text-slate-400 hover:text-white")}>{n} · {label}</button>
  );

  return (
    <>
      <Head kicker="AI Resume Studio" title="Truthful resumes that machines can read" sub="This uses the app's real parser and analysis engine. Edit anything, paste your own resume, or compare against any job description." />
      <div role="tablist" className="glass mb-6 inline-flex flex-wrap gap-1 p-1"><T id="upload" n={1} label="Upload" /><T id="edit" n={2} label="Review & edit" /><T id="tailor" n={3} label="Tailor to a job" /><T id="preview" n={4} label="Preview & compare" /></div>

      {tab === "upload" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <label className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center hover:border-violet-400/50"
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) f.text().then((t) => { setRaw(t); parse(t); }); }}>
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20"><Upload className="text-cyan-200" /></div>
              <span className="font-semibold">Drop a .txt resume here, or click to choose</span>
              <span className="mt-1 text-xs text-slate-400">The full app also accepts PDF and DOCX, parsed securely on the server.</span>
              <input type="file" accept=".txt,text/plain" className="sr-only" onChange={(e) => e.target.files?.[0]?.text().then((t) => { setRaw(t); parse(t); })} />
            </label>
          </Card>
          <Card>
            <label htmlFor="raw" className="label">Or paste resume text</label>
            <textarea id="raw" className="input min-h-[260px] font-mono text-xs" value={raw} onChange={(e) => setRaw(e.target.value)} />
            <div className="mt-3 flex gap-2"><button className="btn-primary" onClick={() => parse(raw)} disabled={raw.trim().length < 30}><Wand2 size={16} />Parse resume</button><button className="btn-ghost" onClick={() => { setRaw(SAMPLE_RESUME); parse(SAMPLE_RESUME); }}>Reset to sample</button></div>
          </Card>
        </div>
      )}

      {tab === "edit" && (
        <div className="space-y-5">
          <Notice><Info size={14} className="mr-1 inline" />These fields were filled in by the real parser from the sample resume. Check and edit everything, because parsing isn&apos;t perfect.</Notice>
          <Card><h2 className="mb-4 font-semibold">Contact</h2><div className="grid gap-3 sm:grid-cols-2">
            {(["name", "email", "phone", "location"] as const).map((k) => <div key={k}><label className="label" htmlFor={`c-${k}`}>{k}</label><input id={`c-${k}`} className="input" value={resume.contact[k]} onChange={(e) => upd((d) => { d.contact[k] = e.target.value; })} /></div>)}
          </div></Card>
          <Card><label className="label" htmlFor="sum">Summary</label><textarea id="sum" className="input min-h-[80px]" value={resume.summary} onChange={(e) => upd((d) => { d.summary = e.target.value; })} /></Card>
          <Card><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Experience</h2><button className="btn-ghost py-1.5 text-xs" onClick={() => upd((d) => { d.experience.unshift({ id: `exp_${Date.now()}`, title: "", company: "", location: "", start: "", end: "", bullets: [""] }); })}><Plus size={14} />Add role</button></div>
            <div className="space-y-4">{resume.experience.map((e, ei) => (
              <div key={e.id} className="rounded-xl border border-white/[0.07] bg-ink-900/40 p-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{(["title", "company", "location", "start", "end"] as const).map((k) => <input key={k} aria-label={k} placeholder={k} className="input" value={e[k]} onChange={(ev) => upd((d) => { d.experience[ei][k] = ev.target.value; })} />)}</div>
                <div className="mt-3 space-y-2">{e.bullets.map((b, bi) => (
                  <div key={bi} className="flex gap-2"><span className="mt-2.5 text-slate-500">•</span><textarea aria-label={`Bullet ${bi + 1}`} className="input min-h-[44px] flex-1 py-2" value={b} onChange={(ev) => upd((d) => { d.experience[ei].bullets[bi] = ev.target.value; })} />
                    <button className="p-2 text-slate-500 hover:text-rose-300" aria-label="Remove bullet" onClick={() => upd((d) => { d.experience[ei].bullets.splice(bi, 1); })}><X size={15} /></button></div>))}</div>
                <button className="btn-ghost mt-3 py-1.5 text-xs" onClick={() => upd((d) => { d.experience[ei].bullets.push(""); })}><Plus size={13} />Bullet</button>
              </div>))}</div>
          </Card>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><h2 className="mb-2 font-semibold">Education</h2>{resume.education.map((e) => <p key={e.id} className="text-sm text-slate-300">{[e.degree, e.school, e.end].filter(Boolean).join(" · ")}</p>)}</Card>
            <Card><label className="label" htmlFor="sk">Skills (comma-separated)</label><input id="sk" className="input" value={resume.skills.join(", ")} onChange={(e) => upd((d) => { d.skills = e.target.value.split(",").map((s) => s.trim()).filter(Boolean); })} /></Card>
          </div>
          <button className="btn-primary" onClick={() => setTab("tailor")}>Next: tailor to a job <ArrowRight size={16} /></button>
        </div>
      )}

      {tab === "tailor" && (
        <div className="space-y-5">
          <Card>
            <label htmlFor="jd" className="label">Paste a job description (a sample is pre-filled)</label>
            <textarea id="jd" className="input min-h-[170px]" value={jd} onChange={(e) => setJd(e.target.value)} />
            <button className="btn-primary mt-3" onClick={analyze} disabled={jd.trim().length < 40}><Wand2 size={16} />Compare & suggest</button>
          </Card>
          {analysis && (<>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <h2 className="font-semibold">Keyword comparison</h2>
                <p className="mt-1 text-sm text-slate-400"><span className="font-display text-2xl text-white">{analysis.coverage.matched}</span> of {analysis.coverage.total} recognizable job keywords already appear in your resume.</p>
                <p className="mt-1 text-xs text-slate-500">This is a literal count, not an ATS score. Employers configure their systems differently.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{analysis.matched.map((k) => <span key={k} className="chip-green"><Check size={11} />{k}</span>)}{analysis.missing.map((k) => <span key={k} className="chip-amber">{k}</span>)}</div>
                <div className="mt-4 max-h-72 overflow-y-auto rounded-xl bg-ink-900/60 p-4"><Highlight text={jd} matched={analysis.matched} missing={analysis.missing} /></div>
                <p className="mt-2 text-xs text-slate-500"><mark className="mark-hit">green</mark> = found in your resume · <mark className="mark-miss">amber</mark> = not found</p>
              </Card>
              <Card>
                <h2 className="mb-3 font-semibold">Requirements check</h2>
                <ul className="space-y-2">{analysis.requirements.map((r, i) => (
                  <li key={i} className="flex gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5 text-sm">
                    {r.status === "evidenced" ? <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />}
                    <div><div className="text-slate-200">{r.text}</div><div className="text-xs text-slate-500">{r.evidence ?? "Not found in your resume. Add it only if it's true, or address it in a cover letter."}</div></div></li>))}</ul>
                {analysis.notes.map((n) => <p key={n} className="mt-2 text-xs text-slate-500">{n}</p>)}
              </Card>
            </div>
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Suggested changes <span className="text-sm font-normal text-slate-400">· {accepted} accepted</span></h2><p className="text-xs text-slate-500">Rule-based suggestions. With an API key, the full app adds AI suggestions, which go through the same guard. Nothing changes until you accept it.</p></div><span className="chip-violet"><ShieldCheck size={12} />Fabrication guard on</span></div>
              {sugs.length === 0 ? <p className="text-sm text-slate-400">No changes suggested. Your bullets already read clearly.</p> : <ul className="space-y-3">{sugs.map((s) => (
                <li key={s.id} className={cx("rounded-xl border p-4", s.status === "accepted" ? "border-emerald-400/30 bg-emerald-500/[0.04]" : s.status === "rejected" ? "border-white/5 opacity-50" : "border-white/10 bg-white/[0.02]")}>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs"><span className="chip">{s.kind}</span><span className="text-slate-500">{s.rationale}</span></div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div><div className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">Before</div><p className="rounded-lg bg-rose-500/[0.08] p-2.5 text-sm text-rose-100/90">{s.before}</p></div>
                    <div><div className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">After · editable</div><textarea aria-label="Suggested text" className="input min-h-[60px] border-emerald-400/20 bg-emerald-500/[0.06] text-sm" value={s.after} onChange={(e) => setSugs((x) => x.map((y) => (y.id === s.id ? { ...y, after: e.target.value } : y)))} /></div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className={cx("btn py-1.5 text-xs", s.status === "accepted" ? "bg-emerald-500/20 text-emerald-100" : "btn-ghost")} aria-pressed={s.status === "accepted"} onClick={() => setSugs((x) => x.map((y) => (y.id === s.id ? { ...y, status: y.status === "accepted" ? "pending" : "accepted" } : y)))}><Check size={13} />{s.status === "accepted" ? "Accepted" : "Accept"}</button>
                    <button className="btn-ghost py-1.5 text-xs" aria-pressed={s.status === "rejected"} onClick={() => setSugs((x) => x.map((y) => (y.id === s.id ? { ...y, status: y.status === "rejected" ? "pending" : "rejected" } : y)))}><X size={13} />{s.status === "rejected" ? "Rejected" : "Reject"}</button>
                  </div></li>))}</ul>}
              <button className="btn-primary mt-5" onClick={() => { setVersions((v) => [...v, { label: `Tailored version ${v.length}`, content: tailored }]); setSel(versions.length); setCompare(true); setTab("preview"); }}>Save tailored version ({accepted} change{accepted === 1 ? "" : "s"})</button>
            </Card>
          </>)}
          <Card>
            <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck size={16} className="text-violet-300" />Try the fabrication guard</h2>
            <p className="mt-1 text-sm text-slate-400">Every AI rewrite in the full app passes this check. Write a &ldquo;rewrite&rdquo; of your first bullet: <i className="text-slate-300">&ldquo;{resume.experience[0]?.bullets[0]}&rdquo;</i></p>
            <textarea aria-label="Proposed rewrite" className="input mt-3 min-h-[60px]" value={guardIn} onChange={(e) => setGuardIn(e.target.value)} />
            <p className={cx("mt-2 flex items-center gap-2 text-sm", guardResult.ok ? "text-emerald-300" : "text-rose-300")}>{guardResult.ok ? <><Check size={15} />Allowed: no new facts introduced.</> : <><X size={15} />Blocked: {guardResult.reason}.</>}</p>
          </Card>
        </div>
      )}

      {tab === "preview" && (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <Card><h2 className="mb-2 text-sm font-semibold">Versions</h2>{versions.map((v, i) => <button key={i} onClick={() => setSel(i)} className={cx("block w-full rounded-lg px-2.5 py-2 text-left text-sm", sel === i ? "bg-violet-500/15 text-white" : "text-slate-400 hover:bg-white/5")}>{v.label}</button>)}</Card>
            <Card>
              <label htmlFor="tpl" className="label">ATS template</label>
              <select id="tpl" className="input" value={template} onChange={(e) => setTemplate(e.target.value)}>{TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.industry}</option>)}</select>
              <ul className="mt-3 space-y-1 text-xs text-slate-400">{TEMPLATES.find((t) => t.id === template)!.guidance.map((g) => <li key={g}>• {g}</li>)}</ul>
              <button className="btn-ghost mt-3 w-full" disabled={sel === 0} aria-pressed={compare} onClick={() => setCompare(!compare)}><Columns2 size={16} />{compare ? "Single view" : "Compare with original"}</button>
              <p className="mt-3 text-xs text-slate-500">DOCX and PDF export runs on the server in the full app.</p>
            </Card>
          </div>
          {compare && sel > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <div><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Original</p><ResumePreview data={versions[0].content} templateId={template} /></div>
              <div><p className="mb-2 text-xs uppercase tracking-wider text-emerald-300">{versions[sel].label} · changes highlighted</p><ResumePreview data={versions[sel].content} templateId={template} changed={changedKeys(versions[0].content, versions[sel].content)} /></div>
            </div>
          ) : <ResumePreview data={versions[sel].content} templateId={template} />}
        </div>
      )}
    </>
  );
}

/* ---------------- jobs ---------------- */
const ago = (d: Date | null | undefined) => { if (!d) return "unknown"; const h = (Date.now() - d.getTime()) / 36e5; return h < 1 ? "just now" : h < 24 ? `${Math.floor(h)}h ago` : `${Math.floor(h / 24)}d ago`; };
const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function Jobs({ jobs, resume, saved, setSaved, track, toCoaches, initialQuery = "" }: { initialQuery?: string; jobs: Job[]; resume: ResumeData; saved: Set<string>; setSaved: (s: Set<string>) => void; track: (j: Job) => void; toCoaches: (a?: Arrangement) => void }) {
  const [q, setQ] = useState(initialQuery); const [mode, setMode] = useState(""); const [ind, setInd] = useState(""); const [onlySaved, setOnlySaved] = useState(false); const [min, setMin] = useState("");
  const [open, setOpen] = useState<string | null>(null); const [tracked, setTracked] = useState<Set<string>>(new Set());
  const industries = [...new Set(jobs.map((j) => j.industry).filter(Boolean))] as string[];
  const list = jobs.filter((j) => (!q || `${j.title} ${j.company} ${j.description} ${j.location}`.toLowerCase().includes(q.toLowerCase())) && (!mode || j.workMode === mode) && (!ind || j.industry === ind) && (!onlySaved || saved.has(j.id)) && (!min || (j.salaryMax ?? 0) >= Number(min)));
  return (
    <>
      <Head kicker="Daily Job Board" title="Verified, currently open jobs" sub="In the full app, listings come only from authorized sources (USAJOBS, Adzuna, employer Greenhouse/Lever boards and approved feeds) and show the true live count." />
      <div className="mb-5"><Notice tone="amber">These <b>{jobs.length} listings are DEMO data</b>. They aren&apos;t real jobs, and the production app never mixes them into live results or counts. They went through the real validation and de-duplication pipeline.</Notice></div>
      <p className="mb-2 text-sm text-slate-400">Where do you want to work?</p>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Work arrangement">
        {([["", "All jobs", LayoutGrid], ["REMOTE", "Remote", Globe], ["HYBRID", "Hybrid", Shuffle], ["ONSITE", "On-site", Building2]] as const).map(([id, label, Icon]) => {
          const n = jobs.filter((j) => !id || j.workMode === id).length;
          return (
            <button key={label} role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
              className={cx("flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", mode === id ? "border-cyan-400/60 bg-gradient-to-r from-violet-500/20 to-cyan-500/15 text-white shadow-[0_0_30px_-10px_rgba(34,211,238,.8)]" : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/25")}>
              <Icon size={20} className={mode === id ? "text-cyan-300" : "text-slate-500"} /><span><span className="block font-semibold">{label}</span><span className="text-xs text-slate-400">{n} listing{n === 1 ? "" : "s"}</span></span>
            </button>);
        })}
      </div>
      {mode && (() => { const c = COACHES.filter((x) => x.focus.includes(mode as Arrangement)).length; return (
        <button onClick={() => toCoaches(mode as Arrangement)} className="mb-4 flex w-full items-center gap-3 rounded-xl border border-violet-400/25 bg-violet-500/[0.07] px-4 py-3 text-left text-sm hover:border-violet-400/50">
          <Users size={18} className="shrink-0 text-violet-300" /><span className="flex-1">Want help with a {mode === "ONSITE" ? "on-site" : mode.toLowerCase()} job search? <b>{c} career coaches</b> focus on {mode === "ONSITE" ? "on-site" : mode.toLowerCase()} roles.</span><ArrowRight size={15} className="text-violet-300" />
        </button>); })()}
      <div className="glass mb-6 grid gap-3 p-4 md:grid-cols-5" role="search">
        <input className="input md:col-span-2" placeholder="Title, skill, or keyword" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" aria-label="Industry" value={ind} onChange={(e) => setInd(e.target.value)}><option value="">Any industry</option>{industries.map((i) => <option key={i}>{i}</option>)}</select>
        <input className="input" type="number" step={5000} placeholder="Min salary (disclosed)" aria-label="Minimum salary" value={min} onChange={(e) => setMin(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-violet-500" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} />Saved only</label>
      </div>
      <p className="mb-3 text-sm text-slate-400" aria-live="polite">{list.length} demo result{list.length === 1 ? "" : "s"}</p>
      {list.length === 0 ? <Empty title="No jobs match those filters" body="Try removing a filter." /> : (
        <div className="grid gap-4 lg:grid-cols-2">{list.map((j) => {
          const m = open === j.id ? explainMatch(`${j.title}\n${j.description}`, resume.skills, resumeCorpus(resume), { workPreference: "REMOTE", location: resume.contact.location }, j) : null;
          const isSaved = saved.has(j.id);
          return (
            <article key={j.id} className="glass glass-hover border-amber-400/20 p-5">
              <div className="flex items-start justify-between gap-3">
                <div><div className="flex flex-wrap items-center gap-2"><DemoBadge /><h3 className="text-lg font-semibold">{j.title}</h3></div><p className="mt-1 text-sm text-slate-300">{j.company}</p></div>
                <button onClick={() => { const n = new Set(saved); isSaved ? n.delete(j.id) : n.add(j.id); setSaved(n); }} className="rounded-lg p-2 text-slate-400 hover:text-cyan-300" aria-pressed={isSaved} aria-label={isSaved ? "Unsave" : "Save"}>{isSaved ? <BookmarkCheck size={19} className="text-cyan-300" /> : <Bookmark size={19} />}</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <span className="chip"><MapPin size={11} />{j.location}</span>
                <span className="chip-violet">{j.workMode === "ONSITE" ? "On-site" : j.workMode[0] + j.workMode.slice(1).toLowerCase()}</span>
                {j.employmentType && <span className="chip">{j.employmentType}</span>}{j.experienceLevel && <span className="chip">{j.experienceLevel}</span>}
                {j.salaryMin ? <span className="chip-green">{money(j.salaryMin)}–{money(j.salaryMax!)} / year</span> : <span className="chip text-slate-500">Salary not disclosed</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 text-[11px] text-slate-500"><span className="flex items-center gap-1"><Clock size={11} />Posted {ago(j.postedAt)}</span><span className="flex items-center gap-1"><ShieldCheck size={11} />Verified {ago(j.lastVerifiedAt)}</span><span>Source: DEMO adapter</span></div>
              {m && <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.05] p-3 text-sm"><ul className="space-y-1 text-slate-200">{m.reasons.map((r) => <li key={r}>• {r}</li>)}</ul><p className="mt-2 text-xs text-slate-500">{m.disclaimer}</p></div>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-ghost py-2" onClick={() => setOpen(open === j.id ? null : j.id)}><Sparkles size={14} />{m ? "Hide" : "Why this matches"}</button>
                <button className="btn-ghost py-2" disabled={tracked.has(j.id)} onClick={() => { track(j); setTracked(new Set(tracked).add(j.id)); }}><Plus size={14} />{tracked.has(j.id) ? "In tracker" : "Track"}</button>
                <span className="btn-primary cursor-not-allowed py-2 opacity-60" title="Demo listings have no real application link">Apply on employer site<ExternalLink size={14} /></span>
              </div>
            </article>);
        })}</div>)}
    </>
  );
}

/* ---------------- tracker ---------------- */
const STATUSES = ["SAVED", "PREPARING", "APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "REJECTED"];
const lab = (s: string) => s[0] + s.slice(1).toLowerCase();
function Tracker({ apps, setApps }: { apps: App[]; setApps: (f: (a: App[]) => App[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const a = apps.find((x) => x.id === open);
  const fu = a ? followUp(a) : null;
  const move = (id: string, status: string) => setApps((as) => as.map((x) => (x.id === id ? { ...x, status, appliedAt: status === "APPLIED" && !x.appliedAt ? new Date().toISOString() : x.appliedAt, updatedAt: new Date().toISOString() } : x)));
  return (
    <>
      <Head kicker="Application Tracker" title="Every application, one place" sub="Drag cards between stages, or open a card for follow-up suggestions. Jobs you press “Track” on in the Job Board show up here." />
      <div className="flex gap-3 overflow-x-auto pb-3">{STATUSES.map((s) => (
        <section key={s} className="w-60 shrink-0" aria-label={lab(s)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) move(id, s); }}>
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{lab(s)} <span className="text-slate-600">{apps.filter((x) => x.status === s).length}</span></h3>
          <div className="min-h-[140px] space-y-2 rounded-2xl border border-white/[0.05] bg-white/[0.015] p-2">
            {apps.filter((x) => x.status === s).map((x) => (
              <button key={x.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", x.id)} onClick={() => setOpen(x.id)} className={cx("glass glass-hover block w-full cursor-grab p-3 text-left", open === x.id && "border-violet-400/50")}>
                <div className="text-sm font-medium">{x.title}</div><div className="text-xs text-slate-400">{x.company}</div></button>))}
          </div>
        </section>))}</div>
      {a && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{a.title}</h2><p className="text-sm text-slate-400">{a.company}</p></div>
            <select aria-label="Status" className="input w-48" value={a.status} onChange={(e) => move(a.id, e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{lab(s)}</option>)}</select></div>
          {fu && <div className="mt-4 rounded-xl border border-violet-400/25 bg-violet-500/[0.07] p-4 text-sm">
            <div className="flex items-start gap-2"><Lightbulb size={16} className="mt-0.5 shrink-0 text-violet-300" /><p>{fu.tip}</p></div>
            {fu.draft && <><pre className="mt-3 whitespace-pre-wrap rounded-lg bg-ink-900/70 p-3 font-sans text-xs text-slate-300">{fu.draft}</pre>
              <button className="btn-ghost mt-2 py-1.5 text-xs" onClick={() => navigator.clipboard.writeText(fu.draft!).then(() => setCopied(true)).catch(() => setCopied(false))}><Copy size={12} />{copied ? "Copied" : "Copy draft"}</button></>}
          </div>}
        </Card>)}
    </>
  );
}

/* ---------------- practice ---------------- */
function Practice() {
  const mods = MODULES.filter((m) => m.kind === "mcq");
  const [mod, setMod] = useState(mods[0].id);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ReturnType<typeof gradeMcq> | null>(null);
  const [star, setStar] = useState("");
  const m = mods.find((x) => x.id === mod)!;
  const sc = star.trim().length > 10 ? starCheck(star) : null;
  return (
    <>
      <Head kicker="Job Assessment Academy" title="Practice the tests employers use" sub="Original practice questions, graded by the app's real grader, with an explanation for every answer. Practice only, never for live employer assessments." />
      <div className="mb-5 flex flex-wrap gap-2">{mods.map((x) => <button key={x.id} onClick={() => { setMod(x.id); setAnswers({}); setResult(null); }} className={cx("chip px-3 py-1.5 text-sm", mod === x.id && "border-violet-400/50 bg-violet-500/20 text-white")}>{x.title}</button>)}</div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <Progress value={Object.keys(answers).length} max={m.questions!.length} label={`${m.title}: ${Object.keys(answers).length} of ${m.questions!.length} answered`} />
          <div className="mt-5 space-y-4">{m.questions!.map((q, n) => { const r = result?.results.find((x) => x.id === q.id); return (
            <fieldset key={q.id} className="rounded-xl border border-white/[0.07] p-4">
              <legend className="px-1 text-sm font-medium">{n + 1}. {q.q}</legend>
              <div className="mt-2 grid gap-1.5">{q.options.map((o, k) => (
                <label key={k} className={cx("flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm", r ? (k === r.correct ? "bg-emerald-500/10 text-emerald-100" : k === r.chosen ? "bg-rose-500/10 text-rose-100" : "text-slate-400") : answers[q.id] === k ? "bg-violet-500/15" : "hover:bg-white/5")}>
                  <input type="radio" name={q.id} className="accent-violet-500" disabled={!!result} checked={answers[q.id] === k} onChange={() => setAnswers((a) => ({ ...a, [q.id]: k }))} />{o}</label>))}</div>
              {r && <p className="mt-2 text-xs text-slate-300"><b className="text-cyan-200">Why:</b> {r.why}</p>}
            </fieldset>); })}</div>
          {result ? <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/[0.04] p-4"><Award className="text-cyan-300" /><span className="font-display text-2xl">{result.score}/{result.total}</span><button className="btn-ghost ml-auto" onClick={() => { setAnswers({}); setResult(null); }}><RotateCcw size={15} />Try again</button></div>
            : <button className="btn-primary mt-5" disabled={Object.keys(answers).length < m.questions!.length} onClick={() => setResult(gradeMcq(m.questions!, answers))}>Submit & see explanations</button>}
        </Card>
        <Card>
          <h2 className="font-semibold">STAR mock interview</h2>
          <p className="mt-1 text-sm text-slate-400">&ldquo;Describe a time you handled a difficult customer or person.&rdquo;</p>
          <textarea aria-label="Your answer" className="input mt-3 min-h-[180px]" value={star} onChange={(e) => setStar(e.target.value)} placeholder="Situation… Task… Action… Result…" />
          {sc && <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">{Object.entries(sc.parts).map(([k, ok]) => <span key={k} className={ok ? "chip-green" : "chip-amber"}>{ok && <Check size={11} />}{k[0].toUpperCase() + k.slice(1)}</span>)}<span className="chip">{sc.words} words</span></div>
            <ul className="space-y-1 text-sm text-slate-300">{sc.tips.map((t) => <li key={t}>• {t}</li>)}</ul>
          </div>}
          <p className="mt-3 text-xs text-slate-500">Live feedback from the rule-based STAR check. The full app adds AI coaching when a key is configured.</p>
        </Card>
      </div>
    </>
  );
}

/* ---------------- learn ---------------- */
function Learn() {
  const [id, setId] = useState(LESSONS[0].id);
  const [a, setA] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const l = LESSONS.find((x) => x.id === id)!;
  const score = l.quiz.filter((q, i) => a[i] === q.answer).length;
  return (
    <>
      <Head kicker="AI Learning Hub" title="Understand the systems that screen you" />
      <Progress value={done.size} max={LESSONS.length} label={`${done.size} of ${LESSONS.length} lessons complete (this session)`} />
      <div className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-1.5">{LESSONS.map((x) => <button key={x.id} onClick={() => { setId(x.id); setA([]); setChecked(false); }} className={cx("glass block w-full p-3 text-left text-sm", id === x.id ? "border-violet-400/50 bg-violet-500/10" : "hover:border-white/20")}><span className="flex items-center justify-between gap-2">{x.title}{done.has(x.id) && <Check size={14} className="shrink-0 text-emerald-300" />}</span><span className="text-xs text-slate-500">{x.track} · {x.minutes} min</span></button>)}</div>
        <Card>
          <h2 className="text-2xl font-semibold">{l.title}</h2><p className="mt-1 text-slate-400">{l.summary}</p>
          <div className="prose-ep mt-4">{l.sections.map((s) => <section key={s.h}><h3>{s.h}</h3>{s.body.map((b, i) => <p key={i}>{b}</p>)}{s.bullets && <ul>{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}</section>)}</div>
          <h3 className="mb-3 mt-6 font-semibold">Check your understanding</h3>
          <div className="space-y-3">{l.quiz.map((q, i) => (
            <fieldset key={i} className="rounded-xl border border-white/[0.07] p-4"><legend className="px-1 text-sm font-medium">{i + 1}. {q.q}</legend>
              <div className="mt-2 grid gap-1.5">{q.options.map((o, k) => <label key={k} className={cx("flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm", checked ? (k === q.answer ? "bg-emerald-500/10 text-emerald-100" : k === a[i] ? "bg-rose-500/10" : "text-slate-400") : a[i] === k ? "bg-violet-500/15" : "hover:bg-white/5")}>
                <input type="radio" name={`lq${i}`} disabled={checked} className="accent-violet-500" checked={a[i] === k} onChange={() => { const n = [...a]; n[i] = k; setA(n); }} />{o}</label>)}</div>
              {checked && <p className="mt-2 text-xs text-slate-300">{q.why}</p>}</fieldset>))}</div>
          {checked ? <p className="mt-4 text-sm">{score}/{l.quiz.length} correct. {score >= 2 ? "Lesson complete!" : "Review the explanations and try again."}</p>
            : <button className="btn-primary mt-4" disabled={a.filter((x) => x !== undefined).length < l.quiz.length} onClick={() => { setChecked(true); if (score >= 2) setDone(new Set(done).add(l.id)); }}>Check answers</button>}
          <h3 className="mb-2 mt-6 font-semibold">Sources</h3>
          <ul className="space-y-1 text-sm">{l.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:underline">{s.label}<ExternalLink size={12} /></a></li>)}</ul>
        </Card>
      </div>
    </>
  );
}

/* ---------------- fair hiring ---------------- */
function Fair() {
  const links: [string, string, string][] = [
    ["EEOC: How to file a charge", "https://www.eeoc.gov/how-file-charge-employment-discrimination", "Start an inquiry online, by phone, or in person."],
    ["EEOC: Time limits", "https://www.eeoc.gov/time-limits-filing-charge", "Generally 180 days, or 300 if a state or local agency enforces a similar law."],
    ["DOL OFCCP: Federal contractors", "https://www.dol.gov/agencies/ofccp/contact/file-complaint", "Complaints about federal contractors."],
    ["DOL Wage and Hour Division", "https://www.dol.gov/agencies/whd", "Unpaid wages, overtime, and minimum wage."],
    ["Job Accommodation Network", "https://askjan.org/", "Free, confidential accommodation guidance."],
    ["DOJ Immigrant & Employee Rights", "https://www.justice.gov/crt/immigrant-and-employee-rights-section", "Citizenship and immigration-status discrimination in hiring."],
  ];
  return (
    <>
      <Head kicker="Fair Hiring Resource Center" title="Know your rights in hiring" />
      <Notice tone="amber"><b>EqualPath AI can&apos;t tell you whether discrimination happened, and this isn&apos;t legal advice.</b> Only these agencies, courts, or a lawyer can make legal determinations. Keep notes and act promptly, because deadlines apply.</Notice>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card><h3 className="font-semibold">Automated tools are covered too</h3><p className="mt-2 text-sm text-slate-400">Title VII, the ADA, and the ADEA apply whether a decision is made by a person or software. The EEOC removed its AI technical-assistance documents in January 2025, but the laws still apply.</p></Card>
        <Card><h3 className="font-semibold">Accommodations</h3><p className="mt-2 text-sm text-slate-400">You can request a reasonable accommodation for online assessments and video interviews. Make the request in writing and keep a copy.</p></Card>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{links.map(([t, u, b]) => (
        <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="glass glass-hover block p-5"><h3 className="flex items-center gap-1.5 font-semibold">{t}<ExternalLink size={13} className="text-cyan-300" /></h3><p className="mt-1 text-sm text-slate-400">{b}</p></a>))}</div>
      <Card className="mt-5 text-sm"><b>EEOC:</b> 1-800-669-4000 · TTY 1-800-669-6820 · ASL video phone 1-844-234-5122 · <b>DOL:</b> 1-866-487-2365</Card>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<DemoApp />);
