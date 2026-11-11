import { and, arrayOverlaps, eq, ilike, lte, or, type SQL } from "drizzle-orm";
import { BadgeCheck, ExternalLink, Globe, MapPin, ShieldQuestion, Search } from "lucide-react";
import { db, schema } from "@/db";
import { getUser } from "@/lib/auth";
import { Card, DemoBadge, Empty, Notice, PageHeader } from "@/components/ui";
import { CoachSubmit } from "@/components/coach/CoachSubmit";

export const metadata = { title: "Career Coach Directory" };
const SPECIALTIES = ["Career change", "Resume review", "Interview prep", "Tech careers", "Healthcare careers", "Returning to work", "Salary negotiation", "Students & new grads", "Federal jobs", "Disability inclusion"];

export default async function Coaches({ searchParams }: { searchParams: Promise<{ q?: string; specialty?: string; max?: string; remote?: string }> }) {
  const sp = await searchParams; const u = await getUser();
  const conds: SQL[] = [eq(schema.coaches.status, "APPROVED")];
  if (process.env.NODE_ENV === "production") conds.push(eq(schema.coaches.isDemo, false));
  if (sp.q) conds.push(or(ilike(schema.coaches.name, `%${sp.q}%`), ilike(schema.coaches.headline, `%${sp.q}%`))!);
  if (sp.specialty) conds.push(arrayOverlaps(schema.coaches.specialties, [sp.specialty]));
  if (sp.max && Number(sp.max) > 0) conds.push(lte(schema.coaches.priceFrom, Number(sp.max)));
  if (sp.remote === "1") conds.push(eq(schema.coaches.remote, true));
  const list = await db.select().from(schema.coaches).where(and(...conds)).limit(60);
  return (
    <>
      <PageHeader kicker="Career Coach Directory" title="Find human support" subtitle="Independent coaches, listed after review. You book directly with them. EqualPath doesn't take payments or endorse individual coaches." />
      <div className="mb-5"><Notice>A <b>Verified</b> badge means an EqualPath admin confirmed that credential with the issuer. Credentials without a badge are self-reported. Many free options exist too: American Job Centers, libraries, and college career centers.</Notice></div>
      <form className="glass mb-6 grid gap-3 p-4 md:grid-cols-5" method="get">
        <div className="relative md:col-span-2"><Search size={16} className="absolute left-3 top-3 text-slate-500" /><input name="q" defaultValue={sp.q} className="input pl-9" placeholder="Name or focus" aria-label="Search coaches" /></div>
        <select name="specialty" defaultValue={sp.specialty ?? ""} className="input" aria-label="Specialty"><option value="">Any specialty</option>{SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select>
        <select name="max" defaultValue={sp.max ?? ""} className="input" aria-label="Max price"><option value="">Any price</option><option value="0">Free</option><option value="50">Up to $50</option><option value="100">Up to $100</option><option value="200">Up to $200</option></select>
        <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remote" value="1" defaultChecked={sp.remote === "1"} className="accent-violet-500" />Remote</label><button className="btn-primary flex-1">Filter</button></div>
      </form>
      {list.length ? <div className="grid gap-4 md:grid-cols-2">{list.map((c) => (
        <Card key={c.id} hover>
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/40 to-cyan-500/30 font-display text-lg font-semibold">{c.name.replace("[DEMO] ", "")[0]}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{c.name}</h2>{c.isDemo && <DemoBadge />}</div><p className="text-sm text-slate-400">{c.headline}</p></div>
          </div>
          <p className="mt-3 line-clamp-3 text-sm text-slate-300">{c.bio}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{c.specialties.map((s) => <span key={s} className="chip-violet">{s}</span>)}</div>
          {c.credentials.length > 0 && <ul className="mt-3 space-y-1 text-xs">{c.credentials.map((cr) => (
            <li key={cr.name} className="flex items-center gap-1.5">{cr.verified ? <BadgeCheck size={14} className="text-emerald-300" /> : <ShieldQuestion size={14} className="text-slate-500" />}<span className={cr.verified ? "text-emerald-100" : "text-slate-400"}>{cr.name}: {cr.issuer}</span><span className="text-slate-600">{cr.verified ? "Verified" : "Self-reported"}</span></li>))}</ul>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-sm">
            <div className="flex flex-wrap gap-3 text-xs text-slate-400"><span>{c.priceFrom === 0 ? "Free" : c.priceFrom ? `From $${c.priceFrom}` : "Pricing on request"}{c.priceNote && ` · ${c.priceNote}`}</span><span className="flex items-center gap-1">{c.remote ? <Globe size={12} /> : <MapPin size={12} />}{c.remote ? "Remote" : c.location}</span>{c.languages.length > 0 && <span>{c.languages.join(", ")}</span>}</div>
            <a href={c.bookingUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-ghost py-1.5 text-xs">Book externally<ExternalLink size={12} /></a>
          </div>
        </Card>))}</div> : <Empty title="No coaches match" body="Try different filters. Listings appear only after admin review." />}
      {u && <div className="mt-10"><CoachSubmit specialties={SPECIALTIES} /></div>}
    </>
  );
}
