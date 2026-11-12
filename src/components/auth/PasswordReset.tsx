"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { ErrorBox } from "../ui";

async function post(url: string, payload: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  return { ok: r.ok, d: await r.json().catch(() => ({})) };
}

export function ForgotForm() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  if (sent) return (
    <div className="space-y-4 text-center" role="status">
      <MailCheck className="mx-auto text-cyan-300" size={36} />
      <p className="text-slate-200">{sent}</p>
      <p className="text-sm text-slate-400">The link works for 60 minutes. Didn&apos;t get it? Wait a minute, check spam, then try again.</p>
      <Link href="/login" className="btn-ghost inline-flex">Back to sign in</Link>
    </div>);
  return (
    <form className="space-y-4" noValidate onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      const { ok, d } = await post("/api/auth/forgot", { email: new FormData(e.currentTarget).get("email") });
      setBusy(false); ok ? setSent(d.message) : setErr(d.issues?.email?.[0] ?? d.error ?? "Something went wrong. Try again.");
    }}>
      {err && <ErrorBox>{err}</ErrorBox>}
      <div><label htmlFor="email" className="label">Email for your account</label><input id="email" name="email" type="email" className="input" autoComplete="email" required autoFocus /></div>
      <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Email me a reset link</button>
      <p className="text-center text-sm text-slate-400">Remembered it? <Link href="/login" className="text-cyan-300">Sign in</Link></p>
    </form>);
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  if (!token) return <div className="space-y-4"><ErrorBox>This reset link is incomplete. Open the link from your email again, or request a new one.</ErrorBox><Link href="/forgot-password" className="btn-primary w-full">Request a new link</Link></div>;
  if (done) return <div className="space-y-3 text-center" role="status"><CheckCircle2 className="mx-auto text-emerald-300" size={36} /><p>Password updated. Taking you in…</p></div>;
  return (
    <form className="space-y-4" noValidate onSubmit={async (e) => {
      e.preventDefault(); setErr(null);
      const f = new FormData(e.currentTarget); const pw = String(f.get("password") ?? ""), again = String(f.get("confirm") ?? "");
      if (pw !== again) { setErr("The two passwords don't match."); return; }
      setBusy(true);
      const { ok, d } = await post("/api/auth/reset", { token, password: pw });
      setBusy(false);
      if (!ok) { setErr(d.issues?.password?.[0] ?? d.error ?? "Something went wrong."); return; }
      setDone(true); router.push(d.next); router.refresh();
    }}>
      {err && <ErrorBox>{err}{/expired|used/.test(err) && <> <Link href="/forgot-password" className="underline">Request a new link</Link>.</>}</ErrorBox>}
      <div><label htmlFor="password" className="label">New password</label>
        <div className="relative"><input id="password" name="password" type={show ? "text" : "password"} className="input pr-10" autoComplete="new-password" required minLength={10} autoFocus />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
        <p className="mt-1 text-xs text-slate-500">At least 10 characters, with a letter and a number.</p></div>
      <div><label htmlFor="confirm" className="label">Type it again</label><input id="confirm" name="confirm" type={show ? "text" : "password"} className="input" autoComplete="new-password" required /></div>
      <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Save new password</button>
      <p className="text-center text-xs text-slate-500">For your security, this signs you out on your other devices.</p>
    </form>);
}
