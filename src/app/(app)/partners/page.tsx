import Link from "next/link";
import { Handshake, Users, Briefcase, Globe, Shuffle, Building2, ArrowRight, MapPin } from "lucide-react";
import { getUser } from "@/lib/auth";
import { listPartners } from "@/lib/partners";
import { DemoBadge, Empty, Notice, PageHeader, cx } from "@/components/ui";

export const metadata = { title: "Hiring Partners" };
export const dynamic = "force-dynamic";
const ARR = { REMOTE: ["Remote", Globe], HYBRID: ["Hybrid", Shuffle], ONSITE: ["On-site", Building2] } as const;

export default async function Partners({ searchParams }: { searchParams: Promise<{ industry?: string; mode?: string }> }) {
  const sp = await searchParams; const u = await getUser();
  const all = await listPartners();
  const industries = [...new Set(all.map((p) => p.industry))].sort();
  const list = all.filter((p) => (!sp.industry || p.industry === sp.industry) && (!sp.mode || p.workModes.includes(sp.mode as "REMOTE")));
  const link = (patch: Record<string, string | undefined>) => `/partners?${new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <>
      <PageHeader kicker="Hiring Partners" title="Companies hiring with EqualPath" subtitle="Employers and staffing agencies we've partnered with. Reach their recruiters directly, and see their open roles." />
      <div className="mb-6"><Notice>Partners are listed only after a partnership agreement is confirmed. Recruiters have agreed to share their contact details here. {u ? "Please be respectful: one thoughtful message is better than many." : <><Link href="/login" className="underline">Sign in</Link> to see recruiter emails and phone numbers.</>}</Notice></div>
      {all.length > 0 && <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href={link({ industry: undefined })} className={cx("chip px-3 py-1.5", !sp.industry && "border-violet-400/50 bg-violet-500/20 text-white")}>All industries</Link>
        {industries.map((i) => <Link key={i} href={link({ industry: i })} className={cx("chip px-3 py-1.5", sp.industry === i && "border-violet-400/50 bg-violet-500/20 text-white")}>{i}</Link>)}
        <span className="mx-1 w-px bg-white/10" />
        {(Object.keys(ARR) as (keyof typeof ARR)[]).map((m) => { const [l, I] = ARR[m]; return <Link key={m} href={link({ mode: sp.mode === m ? undefined : m })} className={cx("chip px-3 py-1.5", sp.mode === m && "border-cyan-400/50 bg-cyan-500/15 text-white")}><I size={12} />{l}</Link>; })}
      </div>}
      {list.length === 0 ? <Empty icon={<Handshake size={22} />} title={all.length ? "No partners match those filters" : "Partnerships coming soon"} body={all.length ? "Try a different industry or work arrangement." : "We're building relationships with employers committed to fair hiring. Check back soon, and meanwhile browse verified jobs."} action={<Link href="/jobs" className="btn-ghost">Browse jobs</Link>} /> : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{list.map((p) => (
          <Link key={p.id} href={`/partners/${p.slug}`} className="glass glass-hover group flex flex-col overflow-hidden">
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${p.brandColor}, #22D3EE)` }} />
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-bold text-white" style={{ background: p.brandColor }} aria-hidden="true">{p.name.replace("DEMO ", "").split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><h2 className="font-semibold">{p.name}</h2>{p.isDemo && <DemoBadge />}</div><p className="text-xs text-slate-400">{p.industry}{p.partnerSince && ` · Partner since ${p.partnerSince}`}</p></div>
              </div>
              <p className="mt-3 line-clamp-3 flex-1 text-sm text-slate-300">{p.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{p.workModes.map((m) => { const [l, I] = ARR[m as keyof typeof ARR]; return <span key={m} className="chip-cyan"><I size={11} />{l}</span>; })}{p.locations.slice(0, 2).map((l) => <span key={l} className="chip"><MapPin size={11} />{l}</span>)}</div>
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-slate-400">
                <span className="flex gap-3"><span className="flex items-center gap-1"><Users size={12} />{p.recruiterCount} recruiter{p.recruiterCount === 1 ? "" : "s"}</span><span className="flex items-center gap-1"><Briefcase size={12} />{p.openJobs} open job{p.openJobs === 1 ? "" : "s"}</span></span>
                <span className="flex items-center gap-1 text-cyan-300">Meet the team<ArrowRight size={13} className="transition group-hover:translate-x-1" /></span>
              </div>
            </div>
          </Link>))}</div>)}
    </>
  );
}
