import Link from "next/link";
import { and, arrayContains, arrayOverlaps, eq, ilike, lte, or, type SQL } from "drizzle-orm";
import { BadgeCheck, ExternalLink, Globe, MapPin, ShieldQuestion, Search, Shuffle, Building2, Users, CalendarCheck } from "lucide-react";
import { db, schema } from "@/db";
import { getUser } from "@/lib/auth";
import { listVersions } from "@/lib/data";
import { bookable, coachForUser } from "@/lib/bookings-server";
import { Card, DemoBadge, Empty, Notice, PageHeader, cx } from "@/components/ui";
import { CoachSubmit } from "@/components/coach/CoachSubmit";
import { BookCoach } from "@/components/coach/BookCoach";

export const metadata = { title: "Career Coaches" };
const SPECIALTIES = ["Career change", "Resume review", "Interview prep", "Tech careers", "Healthcare careers", "Returning to work", "Salary negotiation", "Students & new grads", "Federal jobs", "Disability inclusion"];
const ARR = [["", "Any arrangement", Users, "All coaches"], ["REMOTE", "Remote", Globe, "Work from home or anywhere"], ["HYBRID", "Hybrid", Shuffle, "Some days in the office"], ["ONSITE", "On-site", Building2, "At a workplace every day"]] as const;
type WM = "REMOTE" | "HYBRID" | "ONSITE";

export default async function Coaches({ searchParams }: { searchParams: Promise<{ q?: string; specialty?: string; max?: string; remote?: string; focus?: string; book?: string }> }) {
  const sp = await searchParams; const u = await getUser();
  const focus = (["REMOTE", "HYBRID", "ONSITE"] as const).find((f) => f === sp.focus);
  const base: SQL[] = [eq(schema.coaches.status, "APPROVED")];
  if (process.env.NODE_ENV === "production") base.push(eq(schema.coaches.isDemo, false));
  const conds = [...base];
  if (sp.q) conds.push(or(ilike(schema.coaches.name, `%${sp.q}%`), ilike(schema.coaches.headline, `%${sp.q}%`))!);
  if (sp.specialty) conds.push(arrayOverlaps(schema.coaches.specialties, [sp.specialty]));
  if (sp.max && Number(sp.max) >= 0 && sp.max !== "") conds.push(lte(schema.coaches.priceFrom, Number(sp.max)));
  if (sp.remote === "1") conds.push(eq(schema.coaches.remote, true));
  if (focus) conds.push(arrayContains(schema.coaches.focus, [focus]));
  if (sp.book === "1") conds.push(eq(schema.coaches.bookingEnabled, true));
  const [list, all, versions, mine] = await Promise.all([
    db.select().from(schema.coaches).where(and(...conds)).limit(60),
    db.select({ focus: schema.coaches.focus }).from(schema.coaches).where(and(...base)),
    u ? listVersions(u.id) : Promise.resolve([]),
    u ? coachForUser(u.id) : Promise.resolve(undefined),
  ]);
  const count = (f: string) => all.filter((c) => !f || c.focus.includes(f as WM)).length;
  const link = (patch: Record<string, string | undefined>) => `/coaches?${new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][])}`;
  const versionOpts = versions.map((v) => ({ id: v.id, label: `${v.resumeTitle}: ${v.label}` }));

  return (
    <>
      <PageHeader kicker="Career Coaches" title="Meet a coach for the way you want to work" subtitle="Human support for remote, hybrid and on-site job searches. Request a session right here, or book on the coach's own site." actions={u ? <Link href="/sessions" className="btn-ghost"><CalendarCheck size={16} />My sessions</Link> : undefined} />
      <div className="mb-5"><Notice>A <b>Verified</b> badge means an EqualPath admin confirmed that credential with the issuer. Other credentials are self-reported. EqualPath doesn&apos;t take payments; paid sessions are arranged directly with the coach. Free help is also available at American Job Centers, libraries, and college career centers.</Notice></div>

      <p className="mb-3 text-sm text-slate-400">What kind of work are you looking for?</p>
      <nav aria-label="Work arrangement" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{ARR.map(([id, label, Icon, blurb]) => {
        const on = (focus ?? "") === id;
        return (
          <Link key={label} href={link({ focus: id || undefined })} aria-current={on ? "page" : undefined}
            className={cx("glass p-4 transition", on ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_30px_-10px_rgba(34,211,238,.8)]" : "hover:border-white/20")}>
            <Icon size={20} className="text-cyan-300" /><div className="mt-2 font-semibold">{label}</div><div className="text-xs text-slate-400">{blurb} · {count(id)} coach{count(id) === 1 ? "" : "es"}</div>
          </Link>);
      })}</nav>

      <form className="glass mb-6 grid gap-3 p-4 md:grid-cols-6" method="get">
        {focus && <input type="hidden" name="focus" value={focus} />}
        <div className="relative md:col-span-2"><Search size={16} className="absolute left-3 top-3 text-slate-500" /><input name="q" defaultValue={sp.q} className="input pl-9" placeholder="Name or focus" aria-label="Search coaches" /></div>
        <select name="specialty" defaultValue={sp.specialty ?? ""} className="input" aria-label="Specialty"><option value="">Any specialty</option>{SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select>
        <select name="max" defaultValue={sp.max ?? ""} className="input" aria-label="Max price"><option value="">Any price</option><option value="0">Free</option><option value="50">Up to $50</option><option value="100">Up to $100</option><option value="200">Up to $200</option></select>
        <div className="flex flex-col justify-center gap-1 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="remote" value="1" defaultChecked={sp.remote === "1"} className="accent-violet-500" />Remote sessions</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="book" value="1" defaultChecked={sp.book === "1"} className="accent-violet-500" />Bookable here</label></div>
        <button className="btn-primary">Filter</button>
      </form>

      {list.length ? <div className="grid gap-4 md:grid-cols-2">{list.map((c) => (
        <Card key={c.id} hover>
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/40 to-cyan-500/30 font-display text-lg font-semibold" aria-hidden="true">{c.name.replace("[DEMO] ", "")[0]}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{c.name}</h2>{c.isDemo && <DemoBadge />}</div><p className="text-sm text-slate-400">{c.headline}</p></div>
          </div>
          {c.focus.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{c.focus.map((f) => { const a = ARR.find((x) => x[0] === f)!; const I = a[2]; return <span key={f} className="chip-cyan"><I size={11} />{a[1]}</span>; })}</div>}
          <p className="mt-3 line-clamp-3 text-sm text-slate-300">{c.bio}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{c.specialties.map((s) => <span key={s} className="chip-violet">{s}</span>)}</div>
          {c.credentials.length > 0 && <ul className="mt-3 space-y-1 text-xs">{c.credentials.map((cr) => (
            <li key={cr.name} className="flex items-center gap-1.5">{cr.verified ? <BadgeCheck size={14} className="text-emerald-300" /> : <ShieldQuestion size={14} className="text-slate-500" />}<span className={cr.verified ? "text-emerald-100" : "text-slate-400"}>{cr.name}: {cr.issuer}</span><span className="text-slate-600">{cr.verified ? "Verified" : "Self-reported"}</span></li>))}</ul>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-sm">
            <div className="flex flex-wrap gap-3 text-xs text-slate-400"><span>{c.priceFrom === 0 ? "Free" : c.priceFrom ? `From $${c.priceFrom}` : "Pricing on request"}{c.priceNote && ` · ${c.priceNote}`}</span><span className="flex items-center gap-1">{c.remote ? <Globe size={12} /> : <MapPin size={12} />}{c.remote ? "Remote" : c.location}</span>{c.languages.length > 0 && <span>{c.languages.join(", ")}</span>}</div>
            <div className="flex gap-2">
              {bookable(c) && c.userId !== u?.id && <BookCoach signedIn={!!u} versions={versionOpts} coach={{ id: c.id, name: c.name, headline: c.headline, formats: c.formats, location: c.location, priceFrom: c.priceFrom, focus: c.focus }} />}
              <a href={c.bookingUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-ghost py-1.5 text-xs">Coach&apos;s site<ExternalLink size={12} /></a>
            </div>
          </div>
        </Card>))}</div> : <Empty title="No coaches match" body="Try a different arrangement or fewer filters. Listings appear only after admin review." />}
      {u && !mine && <div className="mt-10"><CoachSubmit specialties={SPECIALTIES} /></div>}
      {mine && <div className="mt-10"><Notice tone="cyan">You have a coach listing ({mine.status.toLowerCase()}). Manage availability and session requests in the <Link href="/coach-portal" className="underline">Coach Portal</Link>.</Notice></div>}
    </>
  );
}
