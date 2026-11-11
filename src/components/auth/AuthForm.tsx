"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ErrorBox } from "../ui";
import { Loader2 } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr(null); setFieldErr({});
    const f = new FormData(e.currentTarget);
    const payload = mode === "signup"
      ? { name: f.get("name"), email: f.get("email"), password: f.get("password"), acceptTerms: f.get("acceptTerms") === "on" }
      : { email: f.get("email"), password: f.get("password") };
    const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(d.error ?? "Something went wrong"); setFieldErr(d.issues ?? {}); return; }
    router.push(d.next); router.refresh();
  }
  const fe = (k: string) => fieldErr[k]?.[0] && <p className="mt-1 text-xs text-rose-300" id={`${k}-err`}>{fieldErr[k][0]}</p>;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {err && <ErrorBox>{err}</ErrorBox>}
      {mode === "signup" && <div><label htmlFor="name" className="label">Name you go by</label><input id="name" name="name" className="input" autoComplete="name" required aria-describedby="name-err" />{fe("name")}</div>}
      <div><label htmlFor="email" className="label">Email</label><input id="email" name="email" type="email" className="input" autoComplete="email" required aria-describedby="email-err" />{fe("email")}</div>
      <div><label htmlFor="password" className="label">Password</label><input id="password" name="password" type="password" className="input" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 10 : 1} aria-describedby="password-err" />{fe("password")}
        {mode === "signup" && <p className="mt-1 text-xs text-slate-500">At least 10 characters, with a letter and a number.</p>}</div>
      {mode === "signup" && (
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" name="acceptTerms" className="mt-1 accent-violet-500" required />
          <span>I agree to the <Link href="/privacy" className="text-cyan-300 underline">privacy terms</Link>. My resume is never used for AI training unless I opt in later.</span>
        </label>
      )}
      {fe("acceptTerms")}
      <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}{mode === "signup" ? "Create free account" : "Sign in"}</button>
      <p className="text-center text-sm text-slate-400">
        {mode === "signup" ? <>Already have an account? <Link href="/login" className="text-cyan-300">Sign in</Link></> : <>New here? <Link href="/signup" className="text-cyan-300">Create an account</Link></>}
      </p>
    </form>
  );
}
