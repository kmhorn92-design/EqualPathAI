"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Wand2, Check, X, Download, Loader2, ShieldCheck, AlertTriangle, Columns2, Eye, PencilLine, Info } from "lucide-react";
import type { KeywordAnalysis, ResumeData, Suggestion } from "@/lib/resume/types";
import { applySuggestions } from "@/lib/resume/analyze";
import { LEXICON } from "@/lib/resume/lexicon";
import { TEMPLATES } from "@/lib/resume/templates";
import { RESUME_STYLES, DEFAULT_STYLE, isStyleId, type StyleId } from "@/lib/resume/styles";
import { ResumePreview } from "./ResumePreview";
import { TagInput } from "../ui/TagInput";
import { Card, ErrorBox, Notice, cx } from "../ui";

type Version = { id: string; label: string; templateId: string; jobTitle: string | null; createdAt: string; content: ResumeData; jobDescription: string | null; analysis: { analysis?: KeywordAnalysis; suggestions?: Suggestion[] } | null };
export type JobOption = { id: string; title: string; company: string; description: string; saved?: boolean; isDemo?: boolean };
type Props = { resumeId: string; title: string; initial: ResumeData; versions: Version[]; initialVersion?: string; aiAvailable: boolean; initialJob?: JobOption; jobOptions?: JobOption[] };
type Tab = "edit" | "tailor" | "preview";

const newId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
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
    for (const m of text.matchAll(re)) {
      out.push({ t: text.slice(last, m.index) });
      const kind = terms.find(([a]) => a.toLowerCase() === m[0].toLowerCase())?.[1];
      out.push({ t: m[0], k: kind }); last = m.index! + m[0].length;
    }
    out.push({ t: text.slice(last) });
    return out;
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

export function Studio({ resumeId, title, initial, versions: initVersions, initialVersion, aiAvailable, initialJob, jobOptions = [] }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialJob ? "tailor" : initialVersion ? "preview" : "edit");
  const [data, setData] = useState<ResumeData>(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [versions, setVersions] = useState(initVersions);
  // tailoring
  const [jobTitle, setJobTitle] = useState(initialJob ? `${initialJob.title.replace("[DEMO] ", "")} at ${initialJob.company}` : "");
  const [jd, setJd] = useState(initialJob ? `${initialJob.title}\n${initialJob.company}\n\n${initialJob.description}` : "");
  const [pickedJob, setPickedJob] = useState(initialJob?.id ?? "");
  const [useAi, setUseAi] = useState(aiAvailable);
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null);
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [blocked, setBlocked] = useState<{ before: string; reason: string }[]>([]);
  const [aiStatus, setAiStatus] = useState<string>("");
  // preview
  const [selected, setSelected] = useState<string>(initialVersion ?? initVersions[initVersions.length - 1]?.id ?? "");
  const [styleId, setStyleIdState] = useState<StyleId>(DEFAULT_STYLE);
  useEffect(() => { try { const v = localStorage.getItem("ep_resume_style"); if (isStyleId(v)) setStyleIdState(v); } catch { /* storage unavailable */ } }, []);
  const setStyleId = (v: StyleId) => { setStyleIdState(v); try { localStorage.setItem("ep_resume_style", v); } catch { /* ignore */ } };
  const [template, setTemplate] = useState(initVersions.find((v) => v.id === (initialVersion ?? ""))?.templateId ?? "classic");
  const [compare, setCompare] = useState(false);

  const upd = (fn: (d: ResumeData) => void) => { setData((d) => { const n = structuredClone(d); fn(n); return n; }); setDirty(true); };

  async function saveBase() {
    setBusy("save"); setErr(null);
    const r = await fetch(`/api/resumes/${resumeId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ data }) });
    setBusy(null);
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Save failed");
    setDirty(false); setMsg("Edits saved.");
  }

  const autoRan = useRef(false);
  useEffect(() => {
    if (initialJob && !autoRan.current) { autoRan.current = true; analyze(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pickJob = (id: string) => {
    setPickedJob(id);
    const j = jobOptions.find((x) => x.id === id);
    if (j) { setJobTitle(`${j.title.replace("[DEMO] ", "")} at ${j.company}`); setJd(`${j.title}\n${j.company}\n\n${j.description}`); setAnalysis(null); setSugs([]); }
  };

  async function analyze() {
    setBusy("analyze"); setErr(null); setAnalysis(null); setSugs([]); setBlocked([]);
    const r = await fetch(`/api/resumes/${resumeId}/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobDescription: jd, content: data, useAi }) });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return setErr(d.error ?? "Analysis failed");
    setAnalysis(d.analysis); setSugs(d.suggestions); setBlocked(d.blocked ?? []); setAiStatus(d.aiStatus);
  }

  const decide = (id: string, status: Suggestion["status"]) => setSugs((s) => s.map((x) => (x.id === id ? { ...x, status } : x)));
  const editAfter = (id: string, after: string) => setSugs((s) => s.map((x) => (x.id === id ? { ...x, after } : x)));
  const pending = sugs.filter((s) => s.status === "pending").length;
  const accepted = sugs.filter((s) => s.status === "accepted").length;
  const tailored = useMemo(() => applySuggestions(data, sugs), [data, sugs]);

  async function saveVersion(content: ResumeData, label: string, extra: Record<string, unknown> = {}) {
    setBusy("version"); setErr(null);
    const r = await fetch(`/api/resumes/${resumeId}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label, templateId: template, content, ...extra }) });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return setErr(d.error ?? "Could not save version");
    const v: Version = { id: d.id, label, templateId: template, jobTitle: (extra.jobTitle as string) ?? null, createdAt: new Date().toISOString(), content, jobDescription: (extra.jobDescription as string) ?? null, analysis: extra.analysis ? { analysis: extra.analysis as KeywordAnalysis, suggestions: extra.suggestions as Suggestion[] } : null };
    setVersions((vs) => [...vs, v]); setSelected(d.id); setTab("preview"); setMsg(`Saved “${label}”.`); router.refresh();
  }

  async function deleteVersion(id: string) {
    if (!confirm("Delete this version permanently?")) return;
    const r = await fetch(`/api/versions/${id}`, { method: "DELETE" });
    if (r.ok) { const rest = versions.filter((v) => v.id !== id); setVersions(rest); setSelected(rest[rest.length - 1]?.id ?? ""); }
  }
  async function deleteResume() {
    if (!confirm("Delete this resume, its uploaded file, and all versions permanently?")) return;
    const r = await fetch(`/api/resumes/${resumeId}`, { method: "DELETE" });
    if (r.ok) { router.push("/resume"); router.refresh(); }
  }

  const sel = versions.find((v) => v.id === selected);
  const original = versions[0];

  const TabBtn = ({ id, label, short, icon: Icon }: { id: Tab; label: string; short: string; icon: typeof Eye }) => (
    <button role="tab" aria-selected={tab === id} aria-label={label} onClick={() => setTab(id)} className={cx("flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition sm:flex-none sm:px-4", tab === id ? "bg-white/10 text-white" : "text-slate-400 hover:text-white")}><Icon size={15} className="shrink-0" /><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{label}</span></button>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Resume Studio</p><h1 className="text-3xl font-semibold">{title}</h1></div>
        <div className="flex gap-2">{dirty && <button className="btn-primary" onClick={saveBase} disabled={busy === "save"}>{busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Save edits</button>}
          <button className="btn-danger" onClick={deleteResume} aria-label="Delete resume"><Trash2 size={16} /></button></div>
      </div>
      <div role="tablist" className="glass mb-6 flex gap-1 p-1 sm:inline-flex"><TabBtn id="edit" label="1 · Review & edit" short="Edit" icon={PencilLine} /><TabBtn id="tailor" label="2 · Tailor to a job" short="Tailor" icon={Wand2} /><TabBtn id="preview" label="3 · Preview & export" short="Export" icon={Eye} /></div>
      {err && <div className="mb-4"><ErrorBox>{err}</ErrorBox></div>}
      {msg && <div className="mb-4" role="status"><Notice tone="cyan">{msg}</Notice></div>}

      {tab === "edit" && (
        <div className="space-y-5">
          <Notice><Info size={14} className="mr-1 inline" />Check everything we extracted. Parsing isn&apos;t perfect, and you know your history best.</Notice>
          <Card>
            <h2 className="mb-4 font-semibold">Contact</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["name", "email", "phone", "location"] as const).map((k) => (
                <div key={k}><label htmlFor={`c-${k}`} className="label">{k}</label><input id={`c-${k}`} className="input" value={data.contact[k]} onChange={(e) => upd((d) => { d.contact[k] = e.target.value; })} /></div>))}
              <div className="sm:col-span-2"><label htmlFor="c-links" className="label">Links (one per line)</label><textarea id="c-links" className="input min-h-[60px]" value={data.contact.links.join("\n")} onChange={(e) => upd((d) => { d.contact.links = e.target.value.split("\n").filter(Boolean); })} /></div>
            </div>
          </Card>
          <Card><label htmlFor="summary" className="label">Summary</label><textarea id="summary" className="input min-h-[90px]" value={data.summary} onChange={(e) => upd((d) => { d.summary = e.target.value; })} placeholder="2–3 sentences about your background and goals." /></Card>
          <Card>
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Experience</h2>
              <button className="btn-ghost py-1.5 text-xs" onClick={() => upd((d) => { d.experience.unshift({ id: newId("exp"), title: "", company: "", location: "", start: "", end: "", bullets: [""] }); })}><Plus size={14} />Add role</button></div>
            <div className="space-y-4">
              {data.experience.length === 0 && <p className="text-sm text-slate-400">No roles detected. Add your work, volunteer, or caregiving experience.</p>}
              {data.experience.map((e, ei) => (
                <div key={e.id} className="rounded-xl border border-white/[0.07] bg-ink-900/40 p-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {(["title", "company", "location", "start", "end"] as const).map((k) => (
                      <input key={k} aria-label={`${k} for role ${ei + 1}`} placeholder={k[0].toUpperCase() + k.slice(1)} className="input" value={e[k]} onChange={(ev) => upd((d) => { d.experience[ei][k] = ev.target.value; })} />))}
                  </div>
                  <div className="mt-3 space-y-2">
                    {e.bullets.map((b, bi) => (
                      <div key={bi} className="flex gap-2"><span className="mt-2.5 text-slate-500">•</span>
                        <textarea aria-label={`Bullet ${bi + 1} for role ${ei + 1}`} className="input min-h-[44px] flex-1 py-2" rows={Math.max(1, Math.ceil(b.length / 90))} value={b} onChange={(ev) => upd((d) => { d.experience[ei].bullets[bi] = ev.target.value; })} />
                        <button className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-rose-300" aria-label="Remove bullet" onClick={() => upd((d) => { d.experience[ei].bullets.splice(bi, 1); })}><X size={15} /></button></div>))}
                  </div>
                  <div className="mt-3 flex gap-2"><button className="btn-ghost py-1.5 text-xs" onClick={() => upd((d) => { d.experience[ei].bullets.push(""); })}><Plus size={13} />Bullet</button>
                    <button className="btn-ghost py-1.5 text-xs text-rose-200" onClick={() => upd((d) => { d.experience.splice(ei, 1); })}><Trash2 size={13} />Remove role</button></div>
                </div>))}
            </div>
          </Card>
          <Card>
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Education</h2>
              <button className="btn-ghost py-1.5 text-xs" onClick={() => upd((d) => { d.education.push({ id: newId("edu"), school: "", degree: "", field: "", end: "", details: "" }); })}><Plus size={14} />Add</button></div>
            <div className="space-y-3">{data.education.map((e, i) => (
              <div key={e.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_100px_auto]">
                {(["school", "degree", "field", "end"] as const).map((k) => <input key={k} aria-label={k} placeholder={k === "end" ? "Year" : k[0].toUpperCase() + k.slice(1)} className="input" value={e[k]} onChange={(ev) => upd((d) => { d.education[i][k] = ev.target.value; })} />)}
                <button className="rounded-lg p-2 text-slate-500 hover:text-rose-300" aria-label="Remove education" onClick={() => upd((d) => { d.education.splice(i, 1); })}><Trash2 size={15} /></button>
              </div>))}</div>
          </Card>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><label htmlFor="skills" className="label">Skills</label><TagInput id="skills" value={data.skills} onChange={(v) => upd((d) => { d.skills = v; })} placeholder="Add a skill" /></Card>
            <Card><label htmlFor="certs" className="label">Certifications & licenses (one per line)</label><textarea id="certs" className="input min-h-[100px]" value={data.certifications.join("\n")} onChange={(e) => upd((d) => { d.certifications = e.target.value.split("\n").filter((x) => x.trim()); })} /></Card>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={saveBase} disabled={!dirty || busy === "save"}><Save size={16} />Save edits</button>
            <button className="btn-ghost" onClick={() => saveVersion(data, `Edited ${new Date().toLocaleDateString()}`)} disabled={busy === "version"}>Save as new version</button>
            <button className="btn-ghost" onClick={() => setTab("tailor")}>Next: tailor to a job →</button>
          </div>
        </div>
      )}

      {tab === "tailor" && (
        <div className="space-y-5">
          <Card>
            {jobOptions.length > 0 && <div className="mb-4">
              <label htmlFor="pick" className="label">Pick a job from the board</label>
              <select id="pick" className="input" value={pickedJob} onChange={(e) => pickJob(e.target.value)}>
                <option value="">Choose a saved or recent job, or paste a description below</option>
                {jobOptions.some((j) => j.saved) && <optgroup label="Saved jobs">{jobOptions.filter((j) => j.saved).map((j) => <option key={j.id} value={j.id}>{j.title} at {j.company}</option>)}</optgroup>}
                <optgroup label="Recent listings">{jobOptions.filter((j) => !j.saved).map((j) => <option key={j.id} value={j.id}>{j.title} at {j.company}</option>)}</optgroup>
              </select>
            </div>}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div><label htmlFor="jt" className="label">Job title (for your records)</label><input id="jt" className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Patient Access Representative" /></div>
              <label className="flex items-end gap-2 pb-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-violet-500" checked={useAi} disabled={!aiAvailable} onChange={(e) => setUseAi(e.target.checked)} />AI suggestions{!aiAvailable && <span className="text-xs text-slate-500">(not configured)</span>}</label>
            </div>
            <label htmlFor="jd" className="label mt-4">Paste the job description</label>
            <textarea id="jd" className="input min-h-[180px]" value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full posting, including responsibilities and requirements." />
            <button className="btn-primary mt-3" onClick={analyze} disabled={jd.trim().length < 40 || busy === "analyze"}>{busy === "analyze" ? <><Loader2 size={16} className="animate-spin" />Analyzing…</> : <><Wand2 size={16} />Compare & suggest</>}</button>
          </Card>

          {analysis && (
            <>
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
                  {analysis.requirements.length ? <ul className="space-y-2">{analysis.requirements.map((r, i) => (
                    <li key={i} className="flex gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5 text-sm">
                      {r.status === "evidenced" ? <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />}
                      <div><div className="text-slate-200">{r.text}</div><div className="text-xs text-slate-500">{r.evidence ?? "Not found in your resume. Add it only if it's true, or address it in a cover letter."}</div></div></li>))}</ul>
                    : <p className="text-sm text-slate-400">No explicit requirement lines detected.</p>}
                  <div className="mt-4 space-y-1.5">{analysis.notes.map((n) => <p key={n} className="text-xs text-slate-500">{n}</p>)}</div>
                </Card>
              </div>

              <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div><h2 className="font-semibold">Suggested changes <span className="text-sm font-normal text-slate-400">· {pending} pending · {accepted} accepted</span></h2>
                    <p className="text-xs text-slate-500">{aiStatus === "used" ? "AI and rule-based suggestions." : aiStatus === "unconfigured" ? "AI isn't configured on this server, so these are rule-based suggestions only." : aiStatus === "error" ? "AI was unavailable, so these are rule-based suggestions only." : "Rule-based suggestions."} Nothing changes until you accept it.</p></div>
                  <span className="chip-violet"><ShieldCheck size={12} />Fabrication guard on</span>
                </div>
                {blocked.length > 0 && <div className="mb-4"><Notice tone="amber">{blocked.length} AI suggestion{blocked.length > 1 ? "s were" : " was"} blocked automatically because {blocked.length > 1 ? "they" : "it"} added facts not in your resume ({blocked.slice(0, 2).map((b) => b.reason).join("; ")}).</Notice></div>}
                {sugs.length === 0 ? <p className="text-sm text-slate-400">No changes suggested. Your bullets already read clearly. Check the keyword gaps above.</p> : (
                  <ul className="space-y-3">{sugs.map((s) => (
                    <li key={s.id} className={cx("rounded-xl border p-4 transition", s.status === "accepted" ? "border-emerald-400/30 bg-emerald-500/[0.04]" : s.status === "rejected" ? "border-white/5 opacity-50" : "border-white/10 bg-white/[0.02]")}>
                      <div className="mb-2 flex items-center gap-2 text-xs"><span className="chip">{s.kind}</span><span className={s.source === "ai" ? "chip-cyan" : "chip"}>{s.source === "ai" ? "AI" : "Rule"}</span><span className="text-slate-500">{s.rationale}</span></div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div><div className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">Before</div><p className="rounded-lg bg-rose-500/[0.08] p-2.5 text-sm text-rose-100/90">{s.before || "(empty)"}</p></div>
                        <div><div className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">After · editable</div>
                          <textarea aria-label="Suggested text" className="input min-h-[60px] border-emerald-400/20 bg-emerald-500/[0.06] text-sm" value={s.after} onChange={(e) => editAfter(s.id, e.target.value)} disabled={s.status === "rejected"} /></div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button className={cx("btn py-1.5 text-xs", s.status === "accepted" ? "bg-emerald-500/20 text-emerald-100" : "btn-ghost")} onClick={() => decide(s.id, s.status === "accepted" ? "pending" : "accepted")} aria-pressed={s.status === "accepted"}><Check size={13} />{s.status === "accepted" ? "Accepted" : "Accept"}</button>
                        <button className="btn-ghost py-1.5 text-xs" onClick={() => decide(s.id, s.status === "rejected" ? "pending" : "rejected")} aria-pressed={s.status === "rejected"}><X size={13} />{s.status === "rejected" ? "Rejected" : "Reject"}</button>
                      </div>
                    </li>))}</ul>)}
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
                  <button className="btn-primary" disabled={busy === "version"} onClick={() => saveVersion(tailored, jobTitle ? `Tailored: ${jobTitle}` : `Tailored ${new Date().toLocaleDateString()}`, { jobTitle, jobDescription: jd, analysis, suggestions: sugs })}>
                    {busy === "version" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Save tailored version ({accepted} change{accepted === 1 ? "" : "s"})</button>
                  {pending > 0 && <span className="text-xs text-slate-500">Pending suggestions won&apos;t be applied.</span>}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === "preview" && (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <Card>
              <h2 className="mb-2 text-sm font-semibold">Versions</h2>
              <ul className="space-y-1">{versions.map((v) => (
                <li key={v.id} className="group flex items-center gap-1">
                  <button onClick={() => { setSelected(v.id); setTemplate(v.templateId); }} className={cx("flex-1 rounded-lg px-2.5 py-2 text-left text-sm", selected === v.id ? "bg-violet-500/15 text-white" : "text-slate-400 hover:bg-white/5")}>
                    <div className="truncate">{v.label}</div><div className="text-[11px] text-slate-500">{new Date(v.createdAt).toLocaleString()}</div></button>
                  {v.id !== original?.id && <button className="p-1.5 text-slate-600 opacity-0 hover:text-rose-300 group-hover:opacity-100 focus:opacity-100" aria-label={`Delete ${v.label}`} onClick={() => deleteVersion(v.id)}><Trash2 size={13} /></button>}
                </li>))}</ul>
            </Card>
            <Card>
              <h2 className="mb-1 text-sm font-semibold">Style</h2>
              <p className="mb-3 text-xs text-slate-500">All three are one column with real text, so applicant tracking systems can read them.</p>
              <div role="radiogroup" aria-label="Resume style" className="grid gap-2">{RESUME_STYLES.map((st) => (
                <button key={st.id} role="radio" aria-checked={styleId === st.id} onClick={() => setStyleId(st.id)}
                  className={cx("flex items-center gap-3 rounded-xl border p-2.5 text-left transition", styleId === st.id ? "border-violet-400/60 bg-violet-500/10" : "border-white/10 hover:border-white/25")}>
                  <StyleThumb id={st.id} />
                  <span className="min-w-0"><span className="block text-sm font-medium text-white">{st.name}</span><span className="block text-[11px] leading-snug text-slate-400">{st.bestFor}</span></span>
                </button>))}</div>
            </Card>
            <Card>
              <label htmlFor="tpl" className="label">Industry layout</label>
              <select id="tpl" className="input" value={template} onChange={(e) => setTemplate(e.target.value)}>{TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.industry}</option>)}</select>
              <p className="mt-2 text-xs text-slate-500">Sets the section order for your field (for example, certifications first in healthcare).</p>
              {sel && <div className="mt-4 grid gap-2">
                <a className="btn-primary" href={`/api/versions/${sel.id}/export?format=pdf&template=${template}&style=${styleId}`}><Download size={16} />Download PDF</a>
                <a className="btn-ghost" href={`/api/versions/${sel.id}/export?format=docx&template=${template}&style=${styleId}`}><Download size={16} />Download Word (DOCX)</a>
              </div>}
              <button className="btn-ghost mt-2 w-full" onClick={() => setCompare(!compare)} aria-pressed={compare} disabled={!sel || sel.id === original?.id}><Columns2 size={16} />{compare ? "Single view" : "Compare with original"}</button>
            </Card>
          </div>
          <div>
            {!sel ? <p className="text-slate-400">Save a version to preview it.</p> : compare && original ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <div><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Original</p><div className="origin-top-left"><ResumePreview data={original.content} templateId={template} styleId={styleId} /></div></div>
                <div><p className="mb-2 text-xs uppercase tracking-wider text-emerald-300">{sel.label} · changes highlighted</p><ResumePreview data={sel.content} templateId={template} styleId={styleId} changed={changedKeys(original.content, sel.content)} /></div>
              </div>
            ) : <ResumePreview data={sel.content} templateId={template} styleId={styleId} />}
          </div>
        </div>
      )}
    </div>
  );
}

/** Tiny wireframe of each style so the choice is visual. */
function StyleThumb({ id }: { id: StyleId }) {
  const line = (w: string, c = "#CBD5E1", h = 2) => <span className="block rounded-full" style={{ width: w, height: h, background: c }} />;
  return (
    <span aria-hidden className="flex h-[52px] w-10 shrink-0 flex-col gap-[3px] overflow-hidden rounded-[4px] bg-white p-[5px] shadow">
      {id === "spotlight" ? <span className="-mx-[5px] -mt-[5px] mb-[2px] flex flex-col gap-[2px] bg-slate-900 px-[5px] pb-[4px] pt-[5px]">{line("70%", "#fff", 3)}{line("50%", "#64748B")}</span>
        : id === "executive" ? <span className="mb-[2px] flex flex-col items-center gap-[2px] border-b-2 border-double border-slate-800 pb-[3px]">{line("70%", "#111827", 3)}{line("55%", "#9CA3AF")}</span>
        : <span className="mb-[2px] flex flex-col gap-[2px]">{line("75%", "#0F172A", 3)}{line("50%", "#94A3B8")}{line("25%", "#4338CA")}</span>}
      {[0, 1].map((k) => <span key={k} className="flex flex-col gap-[2px]">
        {id === "spotlight" ? <span className="flex items-center gap-[2px]"><span className="h-[5px] w-[2px] bg-teal-600" />{line("40%", "#0F172A")}</span>
          : id === "executive" ? <span className="border-b border-slate-800 pb-[1px]">{line("40%", "#111827")}</span>
          : <span className="flex items-center gap-[2px]">{line("35%", "#4338CA")}{line("50%", "#E2E8F0", 1)}</span>}
        {line("90%")}{line("80%")}</span>)}
    </span>
  );
}
