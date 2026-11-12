"use client";
import { useState } from "react";
import { Mail, Phone, Copy, Check, FileText, Link2 } from "lucide-react";

type R = { name: string; title: string; email: string; phone: string | null; linkedinUrl: string | null };

/** Contact actions + an editable, honest outreach template. Nothing is sent by EqualPath. */
export function ContactRecruiter({ recruiter, company, roles }: { recruiter: R; company: string; roles: string[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const first = recruiter.name.replace(/^\[DEMO\]\s*/, "").split(" ")[0] || recruiter.name;
  const [msg, setMsg] = useState(`Hi ${first},\n\nI found ${company} through EqualPath AI's hiring partners page. I'm interested in ${roles[0] ? `${roles[0].toLowerCase()} roles` : "opportunities on your team"} and would appreciate a few minutes to learn what you look for in candidates.\n\nA little about me: [1–2 sentences about your relevant experience].\n\nThank you for your time,\n[Your name]\n[Phone or LinkedIn]`);
  const subject = `Interested in opportunities at ${company}`;
  const copy = async (k: string, v: string) => { try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(null), 1500); } catch { /* clipboard blocked */ } };
  return (
    <div>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2"><Mail size={14} className="shrink-0 text-cyan-300" /><a href={`mailto:${recruiter.email}`} className="min-w-0 break-all text-slate-200 hover:text-cyan-200 hover:underline">{recruiter.email}</a>
          <button onClick={() => copy("email", recruiter.email)} className="-my-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white" aria-label={`Copy ${recruiter.name}'s email`}>{copied === "email" ? <Check size={15} /> : <Copy size={15} />}</button></div>
        {recruiter.phone ? <div className="flex items-center gap-2"><Phone size={14} className="shrink-0 text-cyan-300" /><a href={`tel:${recruiter.phone.replace(/[^\d+]/g, "")}`} className="text-slate-200 hover:text-cyan-200 hover:underline">{recruiter.phone}</a>
          <button onClick={() => copy("phone", recruiter.phone!)} className="-my-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white" aria-label={`Copy ${recruiter.name}'s phone`}>{copied === "phone" ? <Check size={15} /> : <Copy size={15} />}</button></div>
          : <div className="flex items-center gap-2 text-slate-500"><Phone size={14} />Phone not listed; email preferred</div>}
        {recruiter.linkedinUrl && <div className="flex items-center gap-2"><Link2 size={14} className="text-cyan-300" /><a href={recruiter.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-slate-200 hover:underline">LinkedIn profile</a></div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a className="btn-primary py-1.5 text-xs" href={`mailto:${recruiter.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`}><Mail size={13} />Email {first}</a>
        {recruiter.phone && <a className="btn-ghost py-1.5 text-xs" href={`tel:${recruiter.phone.replace(/[^\d+]/g, "")}`}><Phone size={13} />Call</a>}
        <button className="btn-ghost py-1.5 text-xs" onClick={() => setOpen(!open)} aria-expanded={open}><FileText size={13} />{open ? "Hide template" : "Message template"}</button>
      </div>
      {open && <div className="mt-3">
        <label className="label" htmlFor={`msg-${recruiter.email}`}>Edit before sending. Fill in the [brackets] with your real details.</label>
        <textarea id={`msg-${recruiter.email}`} className="input min-h-[190px] text-sm" value={msg} onChange={(e) => setMsg(e.target.value)} />
        <button className="btn-ghost mt-2 py-1.5 text-xs" onClick={() => copy("msg", `Subject: ${subject}\n\n${msg}`)}>{copied === "msg" ? <Check size={13} /> : <Copy size={13} />}{copied === "msg" ? "Copied" : "Copy message"}</button>
      </div>}
    </div>
  );
}
