"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ban, EyeOff, Eye, Loader2, LogOut, Pause, Play, RotateCcw, ShieldCheck, ShieldOff } from "lucide-react";
import { cx } from "../ui";

async function call(url: string, body: unknown) {
  const r = await fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Request failed");
}

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async (key: string, url: string, body: unknown) => {
    setBusy(key); setErr(null);
    try { await call(url, body); router.refresh(); } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  };
  return { busy, err, run };
}

const btn = "btn-ghost px-2.5 py-1 text-xs";

export function AdminTabs() {
  const path = usePathname();
  const tabs = [["/admin", "Overview"], ["/admin/analytics", "Analytics"], ["/admin/users", "Users"], ["/admin/jobs", "Job board"]] as const;
  return (
    <nav aria-label="Admin sections" className="glass mb-6 flex max-w-full gap-1 overflow-x-auto p-1 sm:inline-flex">
      {tabs.map(([href, label]) => {
        const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cx("shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition", on ? "bg-amber-500/15 text-amber-100" : "text-slate-400 hover:text-white")}>{label}</Link>;
      })}
    </nav>
  );
}

export function UserActions({ id, email, role, suspended, self }: { id: string; email: string; role: "USER" | "ADMIN"; suspended: boolean; self: boolean }) {
  const { busy, err, run } = useAction();
  const url = `/api/admin/users/${id}`;
  if (self) return <span className="text-xs text-slate-500">You</span>;
  const Spin = ({ k, icon }: { k: string; icon: React.ReactNode }) => busy === k ? <Loader2 size={13} className="animate-spin" /> : <>{icon}</>;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {role === "USER"
        ? <button className={btn} disabled={!!busy} onClick={() => confirm(`Give ${email} full admin access?`) && run("promote", url, { action: "promote" })}><Spin k="promote" icon={<ShieldCheck size={13} />} />Make admin</button>
        : <button className={btn} disabled={!!busy} onClick={() => confirm(`Remove admin access from ${email}?`) && run("demote", url, { action: "demote" })}><Spin k="demote" icon={<ShieldOff size={13} />} />Remove admin</button>}
      <button className={btn} disabled={!!busy} title="End all of this user's sessions" onClick={() => run("signout", url, { action: "signout" })}><Spin k="signout" icon={<LogOut size={13} />} />Sign out</button>
      {suspended
        ? <button className={cx(btn, "text-emerald-200")} disabled={!!busy} onClick={() => run("restore", url, { action: "restore" })}><Spin k="restore" icon={<RotateCcw size={13} />} />Restore</button>
        : <button className={cx(btn, "text-rose-200")} disabled={!!busy} onClick={() => { const reason = prompt(`Suspend ${email}? They will be signed out and unable to log in.\n\nReason (kept in the audit log):`); if (reason?.trim()) run("suspend", url, { action: "suspend", reason }); }}><Spin k="suspend" icon={<Ban size={13} />} />Suspend</button>}
      {err && <span role="alert" className="w-full text-right text-xs text-rose-300">{err}</span>}
    </div>
  );
}

const HIDE_REASONS = ["Spam or scam", "Duplicate", "Expired or filled", "Discriminatory language", "Wrong information", "Other"] as const;

export function JobActions({ id, hidden }: { id: string; hidden: boolean }) {
  const { busy, err, run } = useAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof HIDE_REASONS)[number]>("Spam or scam");
  const [note, setNote] = useState("");
  const url = `/api/admin/jobs/${id}`;
  if (hidden) return <span className="inline-flex items-center gap-2"><button className={cx(btn, "text-emerald-200")} disabled={!!busy} onClick={() => run("unhide", url, { action: "unhide" })}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}Show again</button>{err && <span className="text-xs text-rose-300">{err}</span>}</span>;
  return (
    <div className="flex flex-col items-end gap-1.5">
      {!open ? <button className={cx(btn, "text-rose-200")} onClick={() => setOpen(true)}><EyeOff size={13} />Hide</button> : (
        <form className="flex flex-wrap items-center justify-end gap-1.5" onSubmit={(e) => { e.preventDefault(); run("hide", url, { action: "hide", reason, note: note.trim() || undefined }).then(() => setOpen(false)); }}>
          <select aria-label="Reason" className="input w-auto py-1 text-xs" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>{HIDE_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
          <input aria-label="Note (optional)" className="input w-36 py-1 text-xs" placeholder="Note (optional)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          <button className={cx(btn, "text-rose-200")} disabled={!!busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />}Hide</button>
          <button type="button" className={btn} onClick={() => setOpen(false)}>Cancel</button>
        </form>)}
      {err && <span className="text-xs text-rose-300">{err}</span>}
    </div>
  );
}

export function SourcePause({ id, paused }: { id: string; paused: boolean }) {
  const { busy, err, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button className={btn} disabled={!!busy} onClick={() => run("p", `/api/admin/sources/${id}`, { paused: !paused })}>
        {busy ? <Loader2 size={13} className="animate-spin" /> : paused ? <Play size={13} /> : <Pause size={13} />}{paused ? "Resume" : "Pause"}</button>
      {err && <span className="text-xs text-rose-300">{err}</span>}
    </span>
  );
}
