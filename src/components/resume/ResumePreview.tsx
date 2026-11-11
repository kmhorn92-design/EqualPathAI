import type { ResumeData } from "@/lib/resume/types";
import { getTemplate } from "@/lib/resume/templates";

const FONT: Record<string, string> = { Helvetica: "Arial, Helvetica, sans-serif", Times: "'Times New Roman', Times, serif", Calibri: "Calibri, Carlito, Arial, sans-serif", Georgia: "Georgia, serif" };
const T = { summary: "Summary", experience: "Experience", education: "Education", skills: "Skills", certifications: "Certifications", projects: "Projects" };

/** Single-column, ATS-style preview that mirrors the export layout. `changed` highlights edited lines. */
export function ResumePreview({ data, templateId, changed }: { data: ResumeData; templateId: string; changed?: Set<string> }) {
  const t = getTemplate(templateId);
  const H = ({ k }: { k: keyof typeof T }) => <h3 style={{ color: t.accent, borderBottom: `1px solid ${t.accent}` }} className="mb-1.5 mt-4 pb-0.5 text-[13px] font-bold tracking-wide">{t.headingCase === "upper" ? T[k].toUpperCase() : T[k]}</h3>;
  const hl = (key: string) => (changed?.has(key) ? "bg-emerald-100 ring-1 ring-emerald-300 rounded" : "");
  return (
    <article className="mx-auto max-w-[8.5in] rounded-lg bg-white p-8 text-[12.5px] leading-snug text-slate-900 shadow-2xl" style={{ fontFamily: FONT[t.font] }} aria-label="Resume preview">
      <header className="text-center">
        <h2 className="text-2xl font-bold" style={{ fontFamily: FONT[t.font] }}>{data.contact.name || "Your Name"}</h2>
        <p className="mt-1 text-[11.5px] text-slate-700">{[data.contact.location, data.contact.phone, data.contact.email, ...data.contact.links].filter(Boolean).join(" | ")}</p>
      </header>
      {t.sectionOrder.map((s) => {
        if (s === "summary" && data.summary) return <section key={s}><H k={s} /><p className={hl("summary")}>{data.summary}</p></section>;
        if (s === "experience" && data.experience.length) return <section key={s}><H k={s} />{data.experience.map((e) => (
          <div key={e.id} className="mb-2.5"><div className="flex justify-between gap-4 font-semibold"><span>{[e.title, e.company].filter(Boolean).join(", ")}</span><span className="shrink-0 font-normal">{[e.start, e.end].filter(Boolean).join(" – ")}</span></div>
            {e.location && <div className="text-slate-600">{e.location}</div>}
            <ul className="ml-4 mt-0.5 list-disc">{e.bullets.filter(Boolean).map((b, i) => <li key={i} className={hl(`${e.id}:${i}`)}>{b}</li>)}</ul></div>))}</section>;
        if (s === "education" && data.education.length) return <section key={s}><H k={s} />{data.education.map((e) => (
          <div key={e.id} className="mb-1.5"><div className="flex justify-between font-semibold"><span>{[e.degree, e.field].filter(Boolean).join(", ") || e.school}</span><span className="font-normal">{e.end}</span></div>{(e.degree || e.field) && <div>{e.school}</div>}{e.details && <div className="text-slate-600">{e.details}</div>}</div>))}</section>;
        if (s === "skills" && data.skills.length) return <section key={s}><H k={s} /><p className={hl("skills")}>{data.skills.join(", ")}</p></section>;
        if (s === "certifications" && data.certifications.length) return <section key={s}><H k={s} /><ul className="ml-4 list-disc">{data.certifications.map((c, i) => <li key={i}>{c}</li>)}</ul></section>;
        if (s === "projects" && data.projects.length) return <section key={s}><H k={s} />{data.projects.map((p) => <div key={p.id} className="mb-1.5"><div className="font-semibold">{p.name}</div>{p.description && <div>{p.description}</div>}</div>)}</section>;
        return null;
      })}
    </article>
  );
}
