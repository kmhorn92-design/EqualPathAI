import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ExternalLink, Globe, Shuffle, Building2, MapPin, Lock, Briefcase, ArrowLeft } from "lucide-react";
import { db, schema } from "@/db";
import { getUser } from "@/lib/auth";
import { partnerJobs, publishedPartner, visibleRecruiter } from "@/lib/partners";
import { track } from "@/lib/usage";
import { Card, DemoBadge, Empty, Notice } from "@/components/ui";
import { ContactRecruiter } from "@/components/partners/ContactRecruiter";

export const dynamic = "force-dynamic";
const ARR = { REMOTE: ["Remote", Globe], HYBRID: ["Hybrid", Shuffle], ONSITE: ["On-site", Building2] } as const;

export default async function PartnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.query.partners.findFirst({ where: and(eq(schema.partners.slug, slug), publishedPartner()) });
  if (!p) notFound();
  const u = await getUser();
  const [recs, jobs] = await Promise.all([
    db.select().from(schema.recruiters).where(and(eq(schema.recruiters.partnerId, p.id), visibleRecruiter())).orderBy(schema.recruiters.name),
    partnerJobs(p.jobCompanyNames.length ? p.jobCompanyNames : [p.name], p.isDemo),
  ]);
  if (u) await track("partner_contacts_viewed");
  return (
    <>
      <Link href="/partners" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft size={14} />All partners</Link>
      <div className="glass relative mb-6 overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: p.brandColor }} />
        <div className="relative flex flex-wrap items-start gap-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl font-display text-2xl font-bold text-white" style={{ background: p.brandColor }} aria-hidden="true">{p.name.replace("DEMO ", "").split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Hiring partner{p.partnerSince && ` since ${p.partnerSince}`}</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-2 text-3xl font-semibold md:text-4xl">{p.name}{p.isDemo && <DemoBadge />}</h1>
            <p className="mt-1 text-slate-400">{p.industry}</p>
            <p className="mt-4 max-w-3xl text-slate-300">{p.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">{p.workModes.map((m) => { const [l, I] = ARR[m as keyof typeof ARR]; return <span key={m} className="chip-cyan"><I size={11} />{l}</span>; })}{p.locations.map((l) => <span key={l} className="chip"><MapPin size={11} />{l}</span>)}</div>
            {p.hiringFor.length > 0 && <p className="mt-3 text-sm text-slate-400"><span className="text-slate-300">Often hiring for:</span> {p.hiringFor.join(" · ")}</p>}
          </div>
          {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="btn-ghost">Careers site<ExternalLink size={14} /></a>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Talk to a recruiter</h2>
          {!u && <div className="mb-4"><Notice tone="cyan"><Lock size={14} className="mr-1 inline" /><Link href="/login" className="underline">Sign in</Link> or <Link href="/signup" className="underline">create a free account</Link> to see emails and phone numbers.</Notice></div>}
          {recs.length === 0 ? <Empty title="No recruiters listed yet" body="Apply through the careers site, or check back soon." /> : (
            <div className="space-y-4">{recs.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 font-semibold" aria-hidden="true">{r.name.replace("[DEMO] ", "").split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5"><h3 className="font-semibold">{r.name}</h3>{r.isDemo && <DemoBadge />}</div>
                    <p className="text-sm text-slate-400">{r.title}</p>
                    {(r.specialties.length > 0 || r.workModes.length > 0) && <div className="mt-2 flex flex-wrap gap-1.5">{r.workModes.map((m) => <span key={m} className="chip-cyan">{ARR[m as keyof typeof ARR][0]}</span>)}{r.specialties.map((s) => <span key={s} className="chip-violet">{s}</span>)}</div>}
                    <div className="mt-3">{u ? <ContactRecruiter recruiter={{ name: r.name, title: r.title, email: r.email, phone: r.phone, linkedinUrl: r.linkedinUrl }} company={p.name} roles={p.hiringFor} />
                      : <p className="flex items-center gap-1.5 text-sm text-slate-500"><Lock size={13} />Email and phone visible after sign-in</p>}</div>
                  </div>
                </div>
              </Card>))}</div>)}
          <p className="mt-4 text-xs text-slate-500">Contacting a recruiter doesn&apos;t replace applying. Always apply through the official posting. Recruiters will never ask you to pay a fee; report anything suspicious to EqualPath and ReportFraud.ftc.gov.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold">Open jobs</h2>
          <Card>
            {jobs.length === 0 ? <p className="text-sm text-slate-400">No verified listings from {p.name} on the job board right now. {p.website ? "Check their careers site." : ""}</p> : (
              <ul className="divide-y divide-white/5">{jobs.map((j) => (
                <li key={j.id} className="py-3"><a href={j.applyUrl} target="_blank" rel="noopener noreferrer nofollow" className="group block">
                  <div className="flex items-center gap-1.5 font-medium group-hover:text-cyan-200"><Briefcase size={14} className="text-violet-300" />{j.title}<ExternalLink size={12} className="text-slate-500" /></div>
                  <div className="text-xs text-slate-400">{j.location} · {j.workMode === "ONSITE" ? "On-site" : j.workMode[0] + j.workMode.slice(1).toLowerCase()}</div></a></li>))}</ul>)}
            <Link href={`/jobs?company=${encodeURIComponent(p.jobCompanyNames[0] ?? p.name)}${p.isDemo ? "&demo=1" : ""}`} className="btn-ghost mt-3 w-full text-xs">See all on the Job Board</Link>
          </Card>
        </section>
      </div>
    </>
  );
}
