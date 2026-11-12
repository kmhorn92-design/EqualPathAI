"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Eye, EyeOff, Loader2, Check, ShieldCheck, Handshake, X } from "lucide-react";
import { cx, ErrorBox } from "../ui";

type Rec = { id: string; name: string; title: string; email: string; phone: string | null; active: boolean; isDemo: boolean };
type Partner = { id: string; slug: string; name: string; industry: string; status: string; agreementConfirmedAt: string | null; isDemo: boolean; recruiters: Rec[] };

async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.issues ? Object.entries(d.issues).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join("; ") : d.error ?? "Request failed");
  return d;
}
const list = (v: FormDataEntryValue | null) => String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function PartnerAdmin({ partners }: { partners: Partner[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [recFor, setRecFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(null); try { await fn(); router.refresh(); return true; } catch (e) { setErr((e as Error).message); return false; } finally { setBusy(false); } };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Handshake size={17} className="text-cyan-300" />Hiring partners & recruiters</h2>
        <button className="btn-ghost text-xs" onClick={() => setAdding(!adding)}>{adding ? <X size={13} /> : <Plus size={13} />}{adding ? "Cancel" : "Add partner"}</button>
      </div>
      <p className="mb-4 text-xs text-slate-500">A partner is published only with a confirmed partnership agreement. A recruiter&apos;s name, email and phone are published only with their written consent, and you can hide or delete them at any time.</p>
      {err && <div className="mb-3"><ErrorBox>{err}</ErrorBox></div>}

      {adding && <form className="mb-5 grid gap-2 rounded-xl border border-white/10 p-4 sm:grid-cols-2" onSubmit={async (e) => {
        e.preventDefault(); const f = new FormData(e.currentTarget);
        const ok = await run(() => call("/api/admin/partners", "POST", { name: f.get("name"), industry: f.get("industry"), description: f.get("description"), website: f.get("website") || "", brandColor: f.get("brandColor"),
          hiringFor: list(f.get("hiringFor")), locations: list(f.get("locations")), workModes: f.getAll("workModes"), jobCompanyNames: list(f.get("jobCompanyNames")), partnerSince: f.get("partnerSince") || undefined, agreementConfirmed: f.get("agreement") === "on" }));
        if (ok) setAdding(false);
      }}>
        <input name="name" required className="input" placeholder="Company name" aria-label="Company name" />
        <input name="industry" required className="input" placeholder="Industry" aria-label="Industry" />
        <textarea name="description" required minLength={20} className="input min-h-[70px] sm:col-span-2" placeholder="About the company and the partnership (20+ characters)" aria-label="Description" />
        <input name="website" className="input" placeholder="https:// careers site" aria-label="Careers website" />
        <input name="partnerSince" className="input" placeholder="Partner since (e.g. 2026)" aria-label="Partner since" />
        <input name="hiringFor" className="input" placeholder="Often hiring for (comma-separated)" aria-label="Often hiring for" />
        <input name="locations" className="input" placeholder="Locations (comma-separated)" aria-label="Locations" />
        <input name="jobCompanyNames" className="input sm:col-span-2" placeholder="Company name as it appears on job listings (optional, comma-separated)" aria-label="Job listing company names" />
        <div className="flex flex-wrap items-center gap-3 text-sm sm:col-span-2">{[["REMOTE", "Remote"], ["HYBRID", "Hybrid"], ["ONSITE", "On-site"]].map(([v, l]) => <label key={v} className="chip cursor-pointer"><input type="checkbox" name="workModes" value={v} className="accent-violet-500" />{l}</label>)}
          <label className="flex items-center gap-2">Brand color <input type="color" name="brandColor" defaultValue="#8B5CF6" className="h-7 w-10 rounded bg-transparent" /></label></div>
        <label className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] p-3 text-sm sm:col-span-2"><input type="checkbox" name="agreement" className="mt-1 accent-amber-500" />
          <span>A signed partnership agreement with this company is on file and allows EqualPath to publicly list them as a partner. (Leave unchecked to save as a pending draft.)</span></label>
        <button className="btn-primary sm:col-span-2" disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />}Save partner</button>
      </form>}

      {partners.length === 0 ? <p className="text-sm text-slate-400">No partners yet.</p> : <ul className="space-y-3">{partners.map((p) => {
        const live = p.status === "APPROVED" && !!p.agreementConfirmedAt;
        return (
          <li key={p.id} className="rounded-xl border border-white/[0.07] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2"><b>{p.name}</b><span className="text-xs text-slate-400">{p.industry}</span>{p.isDemo && <span className="chip-amber">DEMO</span>}
                <span className={cx("chip", live ? "chip-green" : "chip-amber")}>{live ? "Published" : p.status === "REJECTED" ? "Hidden" : "Draft"}</span>
                {p.agreementConfirmedAt ? <span className="chip"><ShieldCheck size={11} />Agreement on file</span> : <span className="chip-rose">No agreement confirmed</span>}</div>
              <div className="flex flex-wrap gap-1.5">
                {!p.agreementConfirmedAt && <button className="btn-ghost px-2.5 py-1 text-xs" disabled={busy} onClick={() => run(() => call(`/api/admin/partners/${p.id}`, "PATCH", { agreementConfirmed: true, status: "APPROVED" }))}><Check size={12} />Confirm agreement & publish</button>}
                {live ? <button className="btn-ghost px-2.5 py-1 text-xs" disabled={busy} onClick={() => run(() => call(`/api/admin/partners/${p.id}`, "PATCH", { status: "REJECTED" }))}><EyeOff size={12} />Unpublish</button>
                  : p.agreementConfirmedAt && <button className="btn-ghost px-2.5 py-1 text-xs" disabled={busy} onClick={() => run(() => call(`/api/admin/partners/${p.id}`, "PATCH", { status: "APPROVED" }))}><Eye size={12} />Publish</button>}
                <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setRecFor(recFor === p.id ? null : p.id)}><Plus size={12} />Recruiter</button>
                <button className="btn-ghost px-2.5 py-1 text-xs text-rose-200" disabled={busy} onClick={() => run(() => call(`/api/admin/partners/${p.id}`, "DELETE"))} aria-label={`Delete ${p.name}`}><Trash2 size={12} /></button>
              </div>
            </div>
            {recFor === p.id && <form className="mt-3 grid gap-2 rounded-lg bg-white/[0.03] p-3 sm:grid-cols-2" onSubmit={async (e) => {
              e.preventDefault(); const f = new FormData(e.currentTarget);
              const ok = await run(() => call(`/api/admin/partners/${p.id}/recruiters`, "POST", { name: f.get("name"), title: f.get("title"), email: f.get("email"), phone: f.get("phone") || "", linkedinUrl: f.get("linkedinUrl") || "",
                specialties: list(f.get("specialties")), workModes: f.getAll("workModes"), consentConfirmed: f.get("consent") === "on" }));
              if (ok) setRecFor(null);
            }}>
              <input name="name" required className="input" placeholder="Full name" aria-label="Recruiter name" />
              <input name="title" required className="input" placeholder="Title (e.g. Talent Acquisition Partner)" aria-label="Recruiter title" />
              <input name="email" type="email" required className="input" placeholder="Work email" aria-label="Recruiter email" />
              <input name="phone" className="input" placeholder="Phone (optional)" aria-label="Recruiter phone" />
              <input name="specialties" className="input" placeholder="Hires for (comma-separated)" aria-label="Specialties" />
              <input name="linkedinUrl" className="input" placeholder="https:// LinkedIn (optional)" aria-label="LinkedIn URL" />
              <div className="flex flex-wrap gap-2 sm:col-span-2">{[["REMOTE", "Remote"], ["HYBRID", "Hybrid"], ["ONSITE", "On-site"]].map(([v, l]) => <label key={v} className="chip cursor-pointer"><input type="checkbox" name="workModes" value={v} className="accent-violet-500" />{l}</label>)}</div>
              <label className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] p-3 text-sm sm:col-span-2"><input type="checkbox" name="consent" required className="mt-1 accent-amber-500" />
                <span>This recruiter gave written consent for EqualPath to publish their name, title, work email{" "}and phone number to signed-in job seekers.</span></label>
              <button className="btn-primary sm:col-span-2" disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />}Add recruiter</button>
            </form>}
            {p.recruiters.length > 0 && <ul className="mt-3 divide-y divide-white/5 text-sm">{p.recruiters.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className={r.active ? "" : "text-slate-500 line-through"}>{r.name} <span className="text-slate-500">· {r.title} · {r.email}{r.phone && ` · ${r.phone}`}</span></span>
                <span className="flex gap-1.5">
                  <button className="btn-ghost px-2 py-1 text-xs" disabled={busy} onClick={() => run(() => call(`/api/admin/recruiters/${r.id}`, "PATCH", { active: !r.active }))}>{r.active ? <><EyeOff size={12} />Hide</> : <><Eye size={12} />Show</>}</button>
                  <button className="btn-ghost px-2 py-1 text-xs text-rose-200" disabled={busy} onClick={() => run(() => call(`/api/admin/recruiters/${r.id}`, "DELETE"))} aria-label={`Delete ${r.name}`}><Trash2 size={12} /></button>
                </span>
              </li>))}</ul>}
          </li>);
      })}</ul>}
    </div>
  );
}
