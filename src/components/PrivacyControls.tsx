"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { Card, ErrorBox, Notice } from "./ui";

export function PrivacyControls({ initial }: { initial: { aiProcessing: boolean; trainingUse: boolean; retentionDays: number } }) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(next: typeof c) {
    setC(next); setSaved(false);
    const r = await fetch("/api/account/consent", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    setSaved(r.ok);
  }
  async function del() {
    if (!confirm("This permanently deletes your account, resumes, files, and history. This can't be undone. Continue?")) return;
    setBusy(true); setErr(null);
    const r = await fetch("/api/account", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    setBusy(false);
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Could not delete");
    router.push("/"); router.refresh();
  }
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><ShieldCheck size={17} className="text-cyan-300" />Consent & AI</h2>
        <label className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
          <span><span className="block text-sm font-medium">AI processing</span><span className="text-xs text-slate-400">Lets EqualPath send your resume text and messages to our server-side AI provider to create suggestions. If you turn this off, you&apos;ll get rule-based suggestions only.</span></span>
          <input type="checkbox" className="mt-1 h-5 w-5 accent-violet-500" checked={c.aiProcessing} onChange={(e) => save({ ...c, aiProcessing: e.target.checked })} />
        </label>
        <label className="flex items-start justify-between gap-4 border-b border-white/5 py-4">
          <span><span className="block text-sm font-medium">Allow my de-identified content to improve EqualPath models</span><span className="text-xs text-slate-400">Off by default. We never use your resumes for training without this explicit opt-in.</span></span>
          <input type="checkbox" className="mt-1 h-5 w-5 accent-violet-500" checked={c.trainingUse} onChange={(e) => save({ ...c, trainingUse: e.target.checked })} />
        </label>
        <div className="flex items-center justify-between gap-4 pt-4">
          <label htmlFor="ret" className="text-sm"><span className="block font-medium">Resume retention</span><span className="text-xs text-slate-400">Resumes you haven&apos;t updated in this long are deleted automatically.</span></label>
          <select id="ret" className="input w-40" value={c.retentionDays} onChange={(e) => save({ ...c, retentionDays: Number(e.target.value) })}>
            {[30, 90, 180, 365, 730].map((d) => <option key={d} value={d}>{d < 365 ? `${d} days` : `${d / 365} year${d > 365 ? "s" : ""}`}</option>)}
          </select>
        </div>
        {saved && <p className="mt-3 text-xs text-emerald-300" role="status">Saved.</p>}
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Your data</h2>
        <p className="mb-4 text-sm text-slate-400">Download everything we store about you, decrypted, as JSON.</p>
        <a href="/api/account/export" className="btn-ghost"><Download size={16} />Export my data</a>
      </Card>
      <Card className="border-rose-500/20">
        <h2 className="mb-2 font-semibold text-rose-100">Delete account</h2>
        <Notice tone="amber">This permanently deletes your profile, resumes, uploaded files, versions, applications, coaching history, and progress.</Notice>
        <div className="mt-4 flex flex-wrap gap-2"><input type="password" className="input max-w-xs" placeholder="Confirm your password" aria-label="Confirm password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn-danger" disabled={!pw || busy} onClick={del}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}Delete everything</button></div>
        {err && <div className="mt-3"><ErrorBox>{err}</ErrorBox></div>}
      </Card>
    </div>
  );
}
