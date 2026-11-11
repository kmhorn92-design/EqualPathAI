"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { TagInput } from "./ui/TagInput";
import { ErrorBox, Progress, cx } from "./ui";

export type ProfileInput = {
  targetRoles: string[]; industries: string[]; location: string; workPreference: "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";
  experienceLevel: string; education: string; skills: string[];
  accessibility: { reducedMotion?: boolean; highContrast?: boolean; largeText?: boolean; screenReaderHints?: boolean };
};
const INDUSTRIES = ["Healthcare", "Technology", "Customer Service", "Administration", "Finance", "Education", "Logistics", "Creative", "Hospitality", "Government", "Sales"];
const ROLES = ["Medical Assistant", "Customer Support Specialist", "Software Developer", "Data Analyst", "Administrative Assistant", "Bookkeeper", "Warehouse Associate", "Teacher's Aide", "UX Designer", "Program Analyst"];
const SKILLS = ["Customer Service", "Microsoft Office", "Scheduling", "Data Entry", "Communication", "Problem Solving", "Excel", "Teamwork", "Python", "Bilingual"];
const LEVELS = ["Student / no formal experience", "Entry level (0–2 yrs)", "Mid level (3–7 yrs)", "Senior (8+ yrs)", "Returning to work", "Changing careers"];

export function ProfileForm({ initial, mode }: { initial: ProfileInput; mode: "onboarding" | "settings" }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => setP((x) => ({ ...x, [k]: v }));
  const steps = mode === "onboarding" ? [0, 1, 2] : [0, 1, 2];
  const last = step === steps.length - 1;

  async function save() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
    setBusy(false);
    if (!r.ok) { setErr((await r.json().catch(() => ({}))).error ?? "Could not save"); return; }
    if (mode === "onboarding") router.push("/dashboard"); else router.refresh();
    router.refresh();
  }

  const sections = [
    <div key="goals" className="space-y-5">
      <div><label htmlFor="roles" className="label">Target roles</label><TagInput id="roles" value={p.targetRoles} onChange={(v) => set("targetRoles", v)} suggestions={ROLES} placeholder="Type a role and press Enter" /></div>
      <div><label className="label">Industries</label>
        <div className="flex flex-wrap gap-2">{INDUSTRIES.map((i) => { const on = p.industries.includes(i); return (
          <button type="button" key={i} aria-pressed={on} onClick={() => set("industries", on ? p.industries.filter((x) => x !== i) : [...p.industries, i])} className={cx("chip px-3 py-1.5 text-sm", on && "border-violet-400/50 bg-violet-500/20 text-white")}>{i}</button>); })}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="loc" className="label">Location (city, state)</label><input id="loc" className="input" value={p.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Baltimore, MD" /></div>
        <div><label className="label">Work preference</label>
          <div className="grid grid-cols-3 gap-2">{(["REMOTE", "HYBRID", "ONSITE"] as const).map((w) => (
            <button type="button" key={w} aria-pressed={p.workPreference === w} onClick={() => set("workPreference", w)} className={cx("btn-ghost px-2 text-xs", p.workPreference === w && "border-cyan-400/50 bg-cyan-500/15 text-white")}>{w === "ONSITE" ? "On-site" : w[0] + w.slice(1).toLowerCase()}</button>))}</div>
        </div>
      </div>
    </div>,
    <div key="bg" className="space-y-5">
      <div><label htmlFor="lvl" className="label">Experience</label>
        <select id="lvl" className="input" value={p.experienceLevel} onChange={(e) => set("experienceLevel", e.target.value)}><option value="">Select…</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
      <div><label htmlFor="edu" className="label">Education (highest or current)</label><input id="edu" className="input" value={p.education} onChange={(e) => set("education", e.target.value)} placeholder="e.g. Associate degree in progress, GED, certificate program…" /></div>
      <div><label htmlFor="skills" className="label">Skills you already have</label><TagInput id="skills" value={p.skills} onChange={(v) => set("skills", v)} suggestions={SKILLS} placeholder="Type a skill and press Enter" /></div>
    </div>,
    <div key="a11y" className="space-y-3">
      <p className="text-sm text-slate-400">Tune EqualPath to how you work best. You can change these anytime.</p>
      {([["reducedMotion", "Reduce motion and animations"], ["highContrast", "Higher contrast text and borders"], ["largeText", "Larger text"], ["screenReaderHints", "Extra screen-reader descriptions"]] as const).map(([k, l]) => (
        <label key={k} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <span className="text-sm">{l}</span>
          <input type="checkbox" className="h-5 w-5 accent-violet-500" checked={!!p.accessibility[k]} onChange={(e) => set("accessibility", { ...p.accessibility, [k]: e.target.checked })} />
        </label>
      ))}
      <p className="pt-2 text-xs text-slate-500">We never ask for race, ethnicity, gender, age, disability status or other demographic information.</p>
    </div>,
  ];
  const titles = ["Your goals", "Your background", "Accessibility"];

  if (mode === "settings") return (
    <div className="space-y-8">{sections.map((s, i) => <section key={i}><h2 className="mb-4 text-lg font-semibold">{titles[i]}</h2>{s}</section>)}
      {err && <ErrorBox>{err}</ErrorBox>}<button className="btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Save profile</button></div>
  );

  return (
    <div>
      <Progress value={step + 1} max={steps.length} label={`Step ${step + 1} of ${steps.length}: ${titles[step]}`} />
      <div className="mt-6 animate-fadeup" key={step}>{sections[step]}</div>
      {err && <div className="mt-4"><ErrorBox>{err}</ErrorBox></div>}
      <div className="mt-8 flex justify-between">
        <button className="btn-ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}><ArrowLeft size={16} />Back</button>
        {last ? <button className="btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Finish setup</button>
          : <button className="btn-primary" onClick={() => setStep((s) => s + 1)}>Continue<ArrowRight size={16} /></button>}
      </div>
    </div>
  );
}
