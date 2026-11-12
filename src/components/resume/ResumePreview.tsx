import type { CSSProperties, ReactNode } from "react";
import type { ResumeData } from "@/lib/resume/types";
import { getTemplate } from "@/lib/resume/templates";
import { getStyle, type ResumeStyle } from "@/lib/resume/styles";

const SANS = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const T = { summary: "Summary", experience: "Experience", education: "Education", skills: "Skills", certifications: "Certifications", projects: "Projects" };
const dates = (a: string, b: string) => [a, b].filter(Boolean).join(" – ");

function Heading({ s, children }: { s: ResumeStyle; children: ReactNode }) {
  if (s.heading === "rule") return (
    <h3 className="mb-2 mt-5 flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: s.accent }}>
      <span>{children}</span><span aria-hidden className="h-px flex-1" style={{ background: "#E2E8F0" }} /></h3>);
  if (s.heading === "underline") return (
    <h3 className="mb-2 mt-5 border-b pb-1 text-[11.5px] font-bold uppercase tracking-[0.2em]" style={{ color: s.ink, borderColor: s.ink }}>{children}</h3>);
  return (
    <h3 className="mb-2 mt-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: s.ink }}>
      <span aria-hidden className="inline-block h-3.5 w-1 rounded-sm" style={{ background: s.accent }} />{children}</h3>);
}

function Bullet({ s, children, className }: { s: ResumeStyle; children: ReactNode; className?: string }) {
  const dot: CSSProperties = s.id === "spotlight" ? { background: s.accent, width: 5, height: 5, borderRadius: 1, marginTop: 6 }
    : s.id === "modern" ? { background: s.accent, width: 4, height: 4, borderRadius: 9, marginTop: 7 } : { background: s.ink, width: 4, height: 4, borderRadius: 9, marginTop: 7 };
  return <li className={`flex gap-2.5 ${className ?? ""}`}><span aria-hidden className="shrink-0" style={dot} /><span>{children}</span></li>;
}

/** Single-column, ATS-style preview that mirrors the export. `changed` highlights edited lines. */
export function ResumePreview({ data, templateId, styleId, changed }: { data: ResumeData; templateId: string; styleId?: string; changed?: Set<string> }) {
  const t = getTemplate(templateId); const s = getStyle(styleId);
  const font = s.family === "serif" ? SERIF : SANS;
  const hl = (key: string) => (changed?.has(key) ? "bg-emerald-100 ring-1 ring-emerald-300 rounded" : "");
  const contact = [data.contact.location, data.contact.phone, data.contact.email, ...data.contact.links].filter(Boolean);
  const sep = s.header === "center" ? "  |  " : "  ·  ";

  const header = s.header === "band" ? (
    <header className="-mx-10 -mt-10 mb-2 px-10 pb-6 pt-9" style={{ background: s.band }}>
      <h2 className="text-[28px] font-bold leading-tight tracking-tight text-white">{data.contact.name || "Your Name"}</h2>
      <p className="mt-1.5 text-[11.5px]" style={{ color: "#CBD5E1" }}>{contact.join(sep)}</p>
      <div aria-hidden className="mt-4 h-[3px] w-12 rounded" style={{ background: s.accent }} />
    </header>
  ) : s.header === "center" ? (
    <header className="mb-1 border-b-[3px] border-double pb-3 text-center" style={{ borderColor: s.ink }}>
      <h2 className="text-[24px] font-normal uppercase tracking-[0.18em]" style={{ color: s.ink }}>{data.contact.name || "Your Name"}</h2>
      <p className="mt-1.5 text-[11px]" style={{ color: s.muted }}>{contact.join(sep)}</p>
    </header>
  ) : (
    <header className="mb-1">
      <h2 className="text-[30px] font-semibold leading-tight tracking-tight" style={{ color: s.ink }}>{data.contact.name || "Your Name"}</h2>
      <p className="mt-1 text-[11.5px]" style={{ color: s.muted }}>{contact.join(sep)}</p>
      <div aria-hidden className="mt-3 h-[3px] w-10 rounded" style={{ background: s.accent }} />
    </header>
  );

  const sub = (txt: string) => s.id === "executive"
    ? <div className="italic" style={{ color: s.muted }}>{txt}</div>
    : <div className="font-medium" style={{ color: s.id === "spotlight" ? s.accent : s.muted }}>{txt}</div>;

  return (
    <article className="mx-auto max-w-[8.5in] overflow-hidden rounded-lg bg-white p-10 text-[12.5px] leading-[1.45] shadow-2xl" style={{ fontFamily: font, color: s.ink }} aria-label={`Resume preview, ${s.name} style`}>
      {header}
      {t.sectionOrder.map((k) => {
        if (k === "summary" && data.summary) return <section key={k}><Heading s={s}>{T[k]}</Heading><p className={hl("summary")} style={{ color: s.ink }}>{data.summary}</p></section>;
        if (k === "experience" && data.experience.length) return <section key={k}><Heading s={s}>{T[k]}</Heading>{data.experience.map((e) => (
          <div key={e.id} className="mb-3 break-inside-avoid">
            <div className="flex items-baseline justify-between gap-4"><span className="font-semibold">{e.title || e.company}</span><span className="shrink-0 text-[11.5px] tabular-nums" style={{ color: s.muted }}>{dates(e.start, e.end)}</span></div>
            {(e.title && e.company) || e.location ? sub([e.title ? e.company : "", e.location].filter(Boolean).join(" · ")) : null}
            <ul className="mt-1 space-y-0.5">{e.bullets.filter(Boolean).map((b, i) => <Bullet key={i} s={s} className={hl(`${e.id}:${i}`)}>{b}</Bullet>)}</ul></div>))}</section>;
        if (k === "education" && data.education.length) return <section key={k}><Heading s={s}>{T[k]}</Heading>{data.education.map((e) => (
          <div key={e.id} className="mb-2"><div className="flex items-baseline justify-between gap-4"><span className="font-semibold">{[e.degree, e.field].filter(Boolean).join(", ") || e.school}</span><span className="shrink-0 text-[11.5px]" style={{ color: s.muted }}>{e.end}</span></div>
            {(e.degree || e.field) && sub(e.school)}{e.details && <div style={{ color: s.muted }}>{e.details}</div>}</div>))}</section>;
        if (k === "skills" && data.skills.length) return <section key={k}><Heading s={s}>{T[k]}</Heading><p className={hl("skills")}>{data.skills.map((x, i) => <span key={i}>{i > 0 && <span aria-hidden style={{ color: s.id === "executive" ? s.muted : s.accent }}>{"  ·  "}</span>}{x}</span>)}</p></section>;
        if (k === "certifications" && data.certifications.length) return <section key={k}><Heading s={s}>{T[k]}</Heading><ul className="space-y-0.5">{data.certifications.map((c, i) => <Bullet key={i} s={s}>{c}</Bullet>)}</ul></section>;
        if (k === "projects" && data.projects.length) return <section key={k}><Heading s={s}>{T[k]}</Heading>{data.projects.map((p) => <div key={p.id} className="mb-2"><div className="font-semibold">{p.name}</div>{p.description && <div style={{ color: s.ink }}>{p.description}</div>}</div>)}</section>;
        return null;
      })}
    </article>
  );
}
