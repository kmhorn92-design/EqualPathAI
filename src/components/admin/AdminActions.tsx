"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Check, X, BadgeCheck } from "lucide-react";
import { ErrorBox } from "../ui";

async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Request failed");
  return r.json();
}

export function RunIngest({ sourceId, label = "Run now" }: { sourceId?: string; label?: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  return (<span className="inline-flex items-center gap-2">
    <button className={sourceId ? "btn-ghost px-2.5 py-1 text-xs" : "btn-primary"} disabled={busy} onClick={async () => { setBusy(true); setErr(null); try { await call("/api/admin/ingest", "POST", { sourceId }); router.refresh(); } catch (e) { setErr((e as Error).message); } setBusy(false); }}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}{label}</button>{err && <span className="text-xs text-rose-300">{err}</span>}</span>);
}

export function Resolve({ id }: { id: string }) {
  const router = useRouter();
  return <button className="btn-ghost px-2.5 py-1 text-xs" onClick={async () => { await call(`/api/admin/alerts/${id}`, "POST"); router.refresh(); }}><Check size={13} />Resolve</button>;
}

export function Moderate({ kind, id }: { kind: "coaches" | "articles"; id: string }) {
  const router = useRouter();
  const set = async (status: string) => { await call(`/api/admin/${kind}/${id}`, "PATCH", { status }); router.refresh(); };
  return <span className="flex gap-1.5"><button className="btn-ghost px-2.5 py-1 text-xs text-emerald-200" onClick={() => set("APPROVED")}><Check size={13} />Approve</button><button className="btn-ghost px-2.5 py-1 text-xs text-rose-200" onClick={() => set("REJECTED")}><X size={13} />Reject</button></span>;
}

export function VerifyCredential({ id, index, verified }: { id: string; index: number; verified: boolean }) {
  const router = useRouter();
  return <button className="text-xs text-cyan-300 underline" onClick={async () => { if (!verified && !confirm("Confirm you verified this credential directly with the issuer?")) return; await call(`/api/admin/coaches/${id}`, "PATCH", { verifyCredential: index, verified: !verified }); router.refresh(); }}>
    <BadgeCheck size={12} className="mr-0.5 inline" />{verified ? "Unverify" : "Mark verified"}</button>;
}

export function NewArticle() {
  const router = useRouter(); const [open, setOpen] = useState(false); const [err, setErr] = useState<string | null>(null);
  return (<div>
    <button className="btn-ghost text-xs" onClick={() => setOpen(!open)}>{open ? "Cancel" : "+ New article"}</button>
    {open && <form className="mt-3 grid gap-2" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { await call("/api/admin/articles", "POST", Object.fromEntries(f)); setOpen(false); router.refresh(); } catch (x) { setErr((x as Error).message); } }}>
      <input name="title" className="input" placeholder="Title" required /><input name="summary" className="input" placeholder="Summary" required />
      <input name="category" className="input" placeholder="Category" required /><input name="sourceUrl" className="input" placeholder="Source URL (authoritative)" />
      <textarea name="body" className="input min-h-[120px]" placeholder="Body (paragraphs separated by blank lines)" required />
      {err && <ErrorBox>{err}</ErrorBox>}<button className="btn-primary">Create (pending review)</button></form>}
  </div>);
}
