/** Hiring Partners — demo section. All companies and recruiters are fictional (example.com, 555-01xx). */
import { useState } from "react";
import { ArrowLeft, ArrowRight, Briefcase, Building2, Globe, MapPin, Shuffle, Users, Handshake, ExternalLink } from "lucide-react";
import { ContactRecruiter } from "@/components/partners/ContactRecruiter";
import { Notice, cx } from "@/components/ui";

type WM = "REMOTE" | "HYBRID" | "ONSITE";
type Recruiter = { name: string; title: string; email: string; phone: string | null; specialties: string[]; workModes: WM[] };
export type Partner = { id: string; name: string; industry: string; color: string; description: string; hiringFor: string[]; locations: string[]; workModes: WM[]; since: string; recruiters: Recruiter[] };

export const PARTNERS: Partner[] = [
  { id: "northwind", name: "DEMO Northwind Health", industry: "Healthcare", color: "#0E9F8E", since: "2026", workModes: ["ONSITE", "HYBRID", "REMOTE"], locations: ["Baltimore, MD", "Remote (US)"],
    description: "A fictional regional health system hiring patient-access, medical-billing and care-technician roles, with paid certification support for career changers.", hiringFor: ["Patient Care Technician", "Medical Billing Specialist", "Patient Access Rep"],
    recruiters: [
      { name: "Alicia Moreno", title: "Talent Acquisition Partner, Clinical Support", email: "alicia.moreno@northwind-demo.example.com", phone: "(555) 010-2041", specialties: ["Patient care", "Entry-level"], workModes: ["ONSITE", "HYBRID"] },
      { name: "Ben Carter", title: "Recruiter, Revenue Cycle (Remote)", email: "ben.carter@northwind-demo.example.com", phone: null, specialties: ["Medical billing", "Remote roles"], workModes: ["REMOTE"] },
    ] },
  { id: "contoso", name: "DEMO Contoso Labs", industry: "Technology", color: "#6D28D9", since: "2026", workModes: ["REMOTE", "HYBRID"], locations: ["Remote (US)", "Atlanta, GA"],
    description: "A fictional software company with an apprenticeship pathway into junior developer, data analyst and IT support roles. No degree is required for apprentices.", hiringFor: ["Junior Frontend Developer", "Data Analyst", "IT Support"],
    recruiters: [{ name: "Priya Shah", title: "Early Careers Recruiter", email: "priya.shah@contoso-demo.example.com", phone: "(555) 010-3318", specialties: ["Apprenticeships", "Junior developers"], workModes: ["REMOTE", "HYBRID"] }] },
  { id: "fabrikam", name: "DEMO Fabrikam Staffing", industry: "Staffing Agency", color: "#D97706", since: "2026", workModes: ["ONSITE", "REMOTE"], locations: ["Chicago, IL", "Houston, TX", "Remote (US)"],
    description: "A fictional staffing agency placing candidates in customer service, administrative and warehouse roles, with temp-to-hire options.", hiringFor: ["Customer Support Specialist", "Administrative Assistant", "Warehouse Associate"],
    recruiters: [
      { name: "Marcus Lee", title: "Staffing Manager, Customer Service", email: "marcus.lee@fabrikam-demo.example.com", phone: "(555) 010-4472", specialties: ["Call center", "Bilingual roles"], workModes: ["REMOTE", "ONSITE"] },
      { name: "Dana Brooks", title: "Recruiter, Logistics & Light Industrial", email: "dana.brooks@fabrikam-demo.example.com", phone: "(555) 010-4486", specialties: ["Warehouse", "Forklift"], workModes: ["ONSITE"] },
    ] },
  { id: "tailspin", name: "DEMO Tailspin Logistics", industry: "Logistics", color: "#0284C7", since: "2026", workModes: ["ONSITE", "HYBRID"], locations: ["Houston, TX", "Atlanta, GA"],
    description: "A fictional logistics company offering forklift certification and a path from warehouse associate to dispatch and coordinator roles.", hiringFor: ["Warehouse Associate", "Dispatcher", "Logistics Coordinator"],
    recruiters: [{ name: "Keisha Grant", title: "Senior Recruiter, Operations", email: "keisha.grant@tailspin-demo.example.com", phone: "(555) 010-5523", specialties: ["Warehouse", "Dispatch"], workModes: ["ONSITE", "HYBRID"] }] },
];

const ARR: Record<WM, [string, typeof Globe]> = { REMOTE: ["Remote", Globe], HYBRID: ["Hybrid", Shuffle], ONSITE: ["On-site", Building2] };
const initials = (n: string) => n.replace("DEMO ", "").split(" ").map((w) => w[0]).slice(0, 2).join("");
type Job = { id: string; title: string; company: string; location: string; workMode: string };

export function Partners({ jobs, goJobs }: { jobs: Job[]; goJobs: (company: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [ind, setInd] = useState("");
  const [mode, setMode] = useState<WM | "">("");
  const p = PARTNERS.find((x) => x.id === open);
  const industries = [...new Set(PARTNERS.map((x) => x.industry))];
  const list = PARTNERS.filter((x) => (!ind || x.industry === ind) && (!mode || x.workModes.includes(mode)));
  const jobsFor = (name: string) => jobs.filter((j) => j.company === name);

  if (p) return (
    <>
      <button onClick={() => setOpen(null)} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft size={14} />All partners</button>
      <div className="glass relative mb-6 overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: p.color }} />
        <div className="relative flex flex-wrap items-start gap-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl font-display text-2xl font-bold text-white" style={{ background: p.color }} aria-hidden="true">{initials(p.name)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Hiring partner since {p.since}</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-2 text-3xl font-semibold md:text-4xl">{p.name}<span className="chip-amber">DEMO</span></h1>
            <p className="mt-1 text-slate-400">{p.industry}</p>
            <p className="mt-4 max-w-3xl text-slate-300">{p.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">{p.workModes.map((m) => { const [l, I] = ARR[m]; return <span key={m} className="chip-cyan"><I size={11} />{l}</span>; })}{p.locations.map((l) => <span key={l} className="chip"><MapPin size={11} />{l}</span>)}</div>
            <p className="mt-3 text-sm text-slate-400"><span className="text-slate-300">Often hiring for:</span> {p.hiringFor.join(" · ")}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Talk to a recruiter</h2>
          <div className="mb-4"><Notice tone="amber">These recruiters are fictional DEMO contacts (example.com addresses and reserved 555 numbers), so messages won&apos;t reach anyone. In the full app, real recruiters appear only with their written consent, and contact details are visible only after sign-in.</Notice></div>
          <div className="space-y-4">{p.recruiters.map((r) => (
            <div key={r.email} className="glass p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 font-semibold" aria-hidden="true">{initials(r.name)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5"><h3 className="font-semibold">{r.name}</h3><span className="chip-amber">DEMO</span></div>
                  <p className="text-sm text-slate-400">{r.title}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{r.workModes.map((m) => <span key={m} className="chip-cyan">{ARR[m][0]}</span>)}{r.specialties.map((s) => <span key={s} className="chip-violet">{s}</span>)}</div>
                  <div className="mt-3"><ContactRecruiter recruiter={{ name: r.name, title: r.title, email: r.email, phone: r.phone, linkedinUrl: null }} company={p.name} roles={p.hiringFor} /></div>
                </div>
              </div>
            </div>))}</div>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold">Open jobs</h2>
          <div className="glass p-5">
            {jobsFor(p.name).length === 0 ? <p className="text-sm text-slate-400">No listings from {p.name} right now.</p> : <ul className="divide-y divide-white/5">{jobsFor(p.name).slice(0, 6).map((j) => (
              <li key={j.id} className="py-3"><div className="flex items-center gap-1.5 font-medium"><Briefcase size={14} className="text-violet-300" />{j.title}</div><div className="text-xs text-slate-400">{j.location} · {j.workMode === "ONSITE" ? "On-site" : j.workMode[0] + j.workMode.slice(1).toLowerCase()}</div></li>))}</ul>}
            <button onClick={() => goJobs(p.name)} className="btn-ghost mt-3 w-full text-xs">See all on the Job Board<ExternalLink size={12} /></button>
          </div>
        </section>
      </div>
    </>
  );

  return (
    <>
      <div className="mb-6 animate-fadeup">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Hiring Partners</p>
        <h1 className="text-3xl font-semibold md:text-4xl">Companies hiring with EqualPath</h1>
        <p className="mt-2 max-w-3xl text-slate-400">Employers and staffing agencies we&apos;ve partnered with. Reach their recruiters directly by email or phone, and see their open roles.</p>
      </div>
      <div className="mb-6"><Notice tone="amber">All partners and recruiters here are <b>fictional DEMO examples</b>. In the full app, a company is listed only after a partnership agreement is confirmed, and recruiters appear only with their written consent.</Notice></div>
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <button onClick={() => setInd("")} className={cx("chip px-3 py-1.5", !ind && "border-violet-400/50 bg-violet-500/20 text-white")}>All industries</button>
        {industries.map((i) => <button key={i} onClick={() => setInd(i)} className={cx("chip px-3 py-1.5", ind === i && "border-violet-400/50 bg-violet-500/20 text-white")}>{i}</button>)}
        <span className="mx-1 w-px bg-white/10" />
        {(Object.keys(ARR) as WM[]).map((m) => { const [l, I] = ARR[m]; return <button key={m} aria-pressed={mode === m} onClick={() => setMode(mode === m ? "" : m)} className={cx("chip px-3 py-1.5", mode === m && "border-cyan-400/50 bg-cyan-500/15 text-white")}><I size={12} />{l}</button>; })}
      </div>
      {list.length === 0 && <p className="text-slate-400">No partners match those filters.</p>}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{list.map((x) => (
        <button key={x.id} onClick={() => { setOpen(x.id); scrollTo(0, 0); }} className="glass glass-hover group flex flex-col overflow-hidden text-left">
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${x.color}, #22D3EE)` }} />
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-bold text-white" style={{ background: x.color }} aria-hidden="true">{initials(x.name)}</div>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><h2 className="font-semibold">{x.name}</h2><span className="chip-amber">DEMO</span></div><p className="text-xs text-slate-400">{x.industry} · Partner since {x.since}</p></div>
            </div>
            <p className="mt-3 line-clamp-3 flex-1 text-sm text-slate-300">{x.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{x.workModes.map((m) => { const [l, I] = ARR[m]; return <span key={m} className="chip-cyan"><I size={11} />{l}</span>; })}</div>
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-slate-400">
              <span className="flex gap-3"><span className="flex items-center gap-1"><Users size={12} />{x.recruiters.length} recruiter{x.recruiters.length === 1 ? "" : "s"}</span><span className="flex items-center gap-1"><Briefcase size={12} />{jobsFor(x.name).length} open jobs</span></span>
              <span className="flex items-center gap-1 text-cyan-300">Meet the team<ArrowRight size={13} className="transition group-hover:translate-x-1" /></span>
            </div>
          </div>
        </button>))}</div>
      <p className="mt-8 flex items-center gap-2 text-xs text-slate-500"><Handshake size={14} />Contacting a recruiter doesn&apos;t replace applying. Always apply through the official posting, and never pay a fee to get a job.</p>
    </>
  );
}
