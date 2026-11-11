import Link from "next/link";
import { Search, SlidersHorizontal, ExternalLink, Radio } from "lucide-react";
import { getUser } from "@/lib/auth";
import { jobQuerySchema } from "@/lib/validation";
import { demoAllowed, facets, PAGE_SIZE, searchJobs } from "@/lib/jobs/search";
import { DAILY_TARGET } from "@/lib/jobs/registry";
import { externalSearchLinks } from "@/lib/jobs/adapters/partners";
import { Empty, Notice, PageHeader } from "@/components/ui";
import { JobCard, type JobRow } from "@/components/jobs/JobCard";

export const metadata = { title: "Daily Job Board" };
export const dynamic = "force-dynamic";

export default async function Jobs({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const parsed = jobQuerySchema.safeParse(Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== "")));
  const q = parsed.success ? parsed.data : jobQuerySchema.parse({});
  const user = await getUser();
  const [{ total, rows }, f] = await Promise.all([searchJobs(q, user?.id), facets()]);
  const pages = Math.ceil(total / PAGE_SIZE);
  const link = (patch: Record<string, string | undefined>) => `/jobs?${new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][])}`;
  const showingDemo = q.demo === "1" && demoAllowed();

  return (
    <>
      <PageHeader kicker="Daily Job Board" title="Verified, currently open jobs" subtitle="Every listing comes from an authorized source and links directly to the employer's application. We show the real count, never filler." />
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        <span className="chip-cyan px-3 py-1"><Radio size={12} className="animate-pulseglow" />{f.active} verified live listing{f.active === 1 ? "" : "s"}</span>
        {f.lastVerified && <span className="text-slate-500">Last verified {new Date(f.lastVerified).toLocaleString()}</span>}
        {f.active < DAILY_TARGET && <span className="text-xs text-amber-200/80">Below our daily goal of {DAILY_TARGET}. We only show what authorized sources actually provide.</span>}
      </div>

      <form method="get" action="/jobs" className="glass mb-6 grid gap-3 p-4 md:grid-cols-6" role="search">
        <div className="relative md:col-span-3"><Search size={16} className="absolute left-3 top-3 text-slate-500" /><input name="q" defaultValue={q.q} className="input pl-9" placeholder="Title, skill, or keyword" aria-label="Search jobs" /></div>
        <input name="location" defaultValue={q.location} className="input md:col-span-2" placeholder="City or state" aria-label="Location" />
        <button className="btn-primary">Search</button>
        <details className="md:col-span-6" open={!!(q.industry || q.workMode || q.experience || q.salaryMin || q.company || q.type || q.days)}>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-slate-400"><SlidersHorizontal size={14} />Filters</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select name="industry" defaultValue={q.industry ?? ""} className="input" aria-label="Industry"><option value="">Any industry</option>{f.industries.sort().map((i) => <option key={i}>{i}</option>)}</select>
            <select name="workMode" defaultValue={q.workMode ?? ""} className="input" aria-label="Work arrangement"><option value="">Remote, hybrid, or on-site</option><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">On-site</option></select>
            <select name="experience" defaultValue={q.experience ?? ""} className="input" aria-label="Experience level"><option value="">Any experience</option>{f.levels.sort().map((l) => <option key={l}>{l}</option>)}</select>
            <select name="days" defaultValue={q.days?.toString() ?? ""} className="input" aria-label="Posted within"><option value="">Any posting date</option><option value="1">Past 24 hours</option><option value="3">Past 3 days</option><option value="7">Past week</option><option value="30">Past month</option></select>
            <input name="salaryMin" type="number" min={0} step={1000} defaultValue={q.salaryMin} className="input" placeholder="Min salary (disclosed only)" aria-label="Minimum salary" />
            <input name="company" defaultValue={q.company} className="input" placeholder="Company" aria-label="Company" />
            <select name="type" defaultValue={q.type ?? ""} className="input" aria-label="Job type"><option value="">Any job type</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Temporary</option><option>Intern</option></select>
            <div className="flex items-center gap-4 text-sm">
              {user && <label className="flex items-center gap-2"><input type="checkbox" name="saved" value="1" defaultChecked={!!q.saved} className="accent-violet-500" />Saved only</label>}
              {demoAllowed() && <label className="flex items-center gap-2 text-amber-200"><input type="checkbox" name="demo" value="1" defaultChecked={showingDemo} className="accent-amber-500" />DEMO data</label>}
            </div>
          </div>
        </details>
      </form>

      {showingDemo && <div className="mb-4"><Notice tone="amber">You&apos;re viewing <b>DEMO</b> listings for development. These are not real jobs and are never mixed into live results or counts.</Notice></div>}

      <p className="mb-3 text-sm text-slate-400" aria-live="polite">{total} {showingDemo ? "demo" : "verified"} result{total === 1 ? "" : "s"}{q.q ? ` for “${q.q}”` : ""}</p>
      {rows.length ? (
        <div className="grid gap-4 lg:grid-cols-2">{rows.map((j) => <JobCard key={j.id} signedIn={!!user} job={JSON.parse(JSON.stringify(j)) as JobRow} />)}</div>
      ) : (
        <Empty title={f.active ? "No jobs match those filters" : "No verified live listings yet"} body={f.active ? "Try removing a filter or broadening your search." : "This deployment hasn't connected any authorized job sources yet, or none returned open jobs today. We won't show placeholder jobs as real ones."}
          action={<div className="flex flex-wrap justify-center gap-2">{externalSearchLinks(q.q ?? "", q.location ?? "").map((l) => <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">Search {l.name}<ExternalLink size={12} /></a>)}</div>} />
      )}
      {pages > 1 && <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
        {q.page > 1 && <Link className="btn-ghost" href={link({ page: String(q.page - 1) })}>← Prev</Link>}
        <span className="text-sm text-slate-400">Page {q.page} of {pages}</span>
        {q.page < pages && <Link className="btn-ghost" href={link({ page: String(q.page + 1) })}>Next →</Link>}
      </nav>}
      {rows.length > 0 && <div className="mt-8 border-t border-white/5 pt-5 text-sm text-slate-400">More places to search (external, opens in a new tab): {externalSearchLinks(q.q ?? "", q.location ?? "").map((l) => <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="ml-3 text-cyan-300 underline">{l.name}</a>)}</div>}
    </>
  );
}
