import { ExternalLink, Scale, Phone, Clock, Accessibility, FileWarning, Landmark, BookOpen } from "lucide-react";
import { Card, Notice, PageHeader } from "@/components/ui";

export const metadata = { title: "Fair Hiring Resource Center" };

const RIGHTS = [
  ["Protected characteristics", "Under federal law, employers can't discriminate in hiring based on race, color, religion, sex (including pregnancy, sexual orientation, and gender identity), national origin, age (40+), disability, or genetic information. State and local laws may protect more."],
  ["Automated tools are covered too", "These laws apply whether a decision is made by a person, a test, or software. Employers stay responsible for the tools they use."],
  ["Accommodations", "If you have a disability, you can ask for a reasonable accommodation during the application process, including on online assessments and video interviews."],
  ["Retaliation is illegal", "Employers can't punish you for filing a complaint or taking part in an investigation."],
];

const CHANNELS = [
  { icon: Landmark, title: "EEOC: File a charge of discrimination", body: "Start an inquiry online through the EEOC Public Portal, by phone, or in person at a field office.", links: [["How to file a charge", "https://www.eeoc.gov/how-file-charge-employment-discrimination"], ["EEOC Public Portal", "https://publicportal.eeoc.gov/"]] },
  { icon: Clock, title: "Know the deadlines", body: "Charges generally must be filed within 180 calendar days of the discriminatory act, or 300 days if a state or local agency enforces a similar law. Federal employees have different procedures.", links: [["EEOC time limits", "https://www.eeoc.gov/time-limits-filing-charge"]] },
  { icon: FileWarning, title: "Federal contractors: DOL OFCCP", body: "If the employer is a federal contractor, you may be able to file a complaint with the Department of Labor's OFCCP.", links: [["OFCCP complaint information", "https://www.dol.gov/agencies/ofccp/contact/file-complaint"]] },
  { icon: Scale, title: "Wages & hours: DOL Wage and Hour Division", body: "For unpaid wages, overtime, or minimum wage issues, contact the Wage and Hour Division.", links: [["Wage and Hour Division", "https://www.dol.gov/agencies/whd"]] },
  { icon: Accessibility, title: "Accommodations: Job Accommodation Network", body: "JAN, funded by DOL's Office of Disability Employment Policy, gives free, confidential guidance on workplace accommodations.", links: [["AskJAN.org", "https://askjan.org/"], ["ADA.gov", "https://www.ada.gov/"]] },
  { icon: Landmark, title: "Citizenship & immigration-status discrimination", body: "The DOJ Immigrant and Employee Rights Section handles certain citizenship, immigration-status, and national-origin discrimination, and document abuse in hiring.", links: [["DOJ IER", "https://www.justice.gov/crt/immigrant-and-employee-rights-section"]] },
  { icon: BookOpen, title: "Free legal help", body: "Legal aid organizations may help at no cost if you qualify.", links: [["Find legal aid (LSC)", "https://www.lsc.gov/about-lsc/what-legal-aid/get-legal-help"]] },
];

export default function FairHiring() {
  return (
    <>
      <PageHeader kicker="Fair Hiring Resource Center" title="Know your rights in hiring" subtitle="Educational information and official channels from the EEOC, U.S. Department of Labor, and other agencies." />
      <div className="mb-6"><Notice tone="amber"><b>EqualPath AI can&apos;t tell you whether discrimination happened, and this isn&apos;t legal advice.</b> Only the agencies below, courts, or a lawyer can make legal determinations. If you have concerns, keep notes (dates, names, messages) and contact an official channel promptly, since deadlines apply.</Notice></div>

      <h2 className="mb-4 text-xl font-semibold">Your rights at a glance</h2>
      <div className="grid gap-4 md:grid-cols-2">{RIGHTS.map(([t, b]) => <Card key={t}><h3 className="font-semibold">{t}</h3><p className="mt-2 text-sm text-slate-400">{b}</p></Card>)}</div>
      <p className="mt-3 text-sm"><a href="https://www.eeoc.gov/prohibited-employment-policiespractices" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-300 underline">EEOC: Prohibited employment policies & practices<ExternalLink size={12} /></a></p>

      <h2 className="mb-4 mt-10 text-xl font-semibold">Recognizing possible red flags</h2>
      <Card><ul className="prose-ep"><li>Interview questions about your age, religion, pregnancy or family plans, national origin, disability, or arrest record (rules vary by state).</li><li>Job ads that state a preference for a particular age, sex, or national origin.</li><li>Being refused an accommodation for an online test without discussion.</li><li>Different requirements applied to you than to other applicants.</li></ul>
        <p className="text-xs text-slate-500">These are signs worth documenting and asking about. They don&apos;t automatically mean discrimination occurred.</p></Card>

      <h2 className="mb-4 mt-10 text-xl font-semibold">Official reporting & help channels</h2>
      <div className="grid gap-4 md:grid-cols-2">{CHANNELS.map(({ icon: Icon, title, body, links }) => (
        <Card key={title}><div className="flex gap-3"><Icon size={20} className="mt-0.5 shrink-0 text-cyan-300" /><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-400">{body}</p>
          <div className="mt-3 flex flex-wrap gap-2">{links.map(([l, u]) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 text-xs">{l}<ExternalLink size={12} /></a>)}</div></div></div></Card>))}</div>

      <Card className="mt-6"><div className="flex items-center gap-3"><Phone size={18} className="text-violet-300" /><div className="text-sm"><b>EEOC:</b> 1-800-669-4000 · TTY 1-800-669-6820 · ASL video phone 1-844-234-5122 · <b>DOL:</b> 1-866-487-2365</div></div>
        <p className="mt-2 text-xs text-slate-500">Phone numbers and procedures can change. Confirm on the official websites.</p></Card>

      <h2 className="mb-4 mt-10 text-xl font-semibold">Accessibility in online hiring</h2>
      <Card><ul className="prose-ep"><li>Ask the employer early whether assessments are timed, use video, or need specific devices, and request accommodations in writing.</li><li>Examples include extra time, screen-reader-compatible formats, captioning, alternative formats, or a different assessment method.</li><li>Keep a copy of your request and the employer&apos;s response.</li></ul></Card>
    </>
  );
}
