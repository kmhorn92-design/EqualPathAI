"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, ErrorBox, Notice } from "../ui";

export function CoachSubmit({ specialties }: { specialties: string[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr(null);
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get("name"), headline: f.get("headline"), bio: f.get("bio"), specialties: f.getAll("specialties"),
      credentials: String(f.get("credentials") || "").split("\n").filter(Boolean).map((l) => { const [name, issuer, verifyUrl] = l.split("|").map((s) => s.trim()); return { name, issuer: issuer ?? "", verifyUrl: verifyUrl ?? "" }; }),
      priceFrom: f.get("priceFrom") ? Number(f.get("priceFrom")) : null, priceNote: f.get("priceNote") || undefined, bookingUrl: f.get("bookingUrl"), remote: f.get("remote") === "on", location: f.get("location") || undefined,
      languages: String(f.get("languages") || "").split(",").map((s) => s.trim()).filter(Boolean),
    };
    const r = await fetch("/api/coaches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    if (r.ok) setDone(true); else { const d = await r.json().catch(() => ({})); setErr(d.error + (d.issues ? `: ${Object.keys(d.issues).join(", ")}` : "")); }
  }
  if (done) return <Notice tone="cyan">Thanks! Your listing is pending review. Credentials stay marked &ldquo;self-reported&rdquo; until we verify them.</Notice>;
  return (
    <Card>
      <div className="flex items-center justify-between"><div><h2 className="font-semibold">Are you a career coach?</h2><p className="text-sm text-slate-400">Submit a listing for review.</p></div><button className="btn-ghost" onClick={() => setOpen(!open)}>{open ? "Close" : "Submit a listing"}</button></div>
      {open && <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
        <input name="name" required className="input" placeholder="Name" aria-label="Name" />
        <input name="headline" required className="input" placeholder="Headline" aria-label="Headline" />
        <textarea name="bio" required minLength={40} className="input min-h-[90px] sm:col-span-2" placeholder="Bio (40+ characters)" aria-label="Bio" />
        <fieldset className="sm:col-span-2"><legend className="label">Specialties</legend><div className="flex flex-wrap gap-2">{specialties.map((s) => <label key={s} className="chip cursor-pointer"><input type="checkbox" name="specialties" value={s} className="accent-violet-500" />{s}</label>)}</div></fieldset>
        <textarea name="credentials" className="input min-h-[70px] sm:col-span-2" placeholder={"Credentials, one per line: Name | Issuer | verification URL (optional)"} aria-label="Credentials" />
        <input name="priceFrom" type="number" min={0} className="input" placeholder="Price from (USD, 0 = free)" aria-label="Price from" />
        <input name="priceNote" className="input" placeholder="Price note (e.g. sliding scale)" aria-label="Price note" />
        <input name="bookingUrl" type="url" required className="input" placeholder="https:// booking link" aria-label="Booking URL" />
        <input name="location" className="input" placeholder="Location (if in person)" aria-label="Location" />
        <input name="languages" className="input" placeholder="Languages (comma-separated)" aria-label="Languages" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remote" defaultChecked className="accent-violet-500" />Offers remote sessions</label>
        {err && <div className="sm:col-span-2"><ErrorBox>{err}</ErrorBox></div>}
        <button className="btn-primary sm:col-span-2" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Submit for review</button>
      </form>}
    </Card>
  );
}
