"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2, ClipboardPaste, Lock } from "lucide-react";
import { ErrorBox, Progress, cx } from "../ui";

const ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export function Uploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const [stage, setStage] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");

  function upload(file: File) {
    setErr(null);
    if (file.size > 5 * 1024 * 1024) return setErr("That file is larger than 5 MB.");
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) return setErr("Please choose a PDF, DOCX, or TXT file.");
    const fd = new FormData(); fd.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/resumes");
    setPct(0); setStage("Encrypting & uploading…");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) { const p = Math.round((e.loaded / e.total) * 70); setPct(p); if (p >= 70) setStage("Extracting and structuring your experience…"); } };
    xhr.onload = () => {
      let d: { id?: string; error?: string } = {};
      try { d = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && d.id) { setPct(100); setStage("Done. Opening Studio…"); router.push(`/resume/${d.id}`); }
      else { setPct(null); setErr(d.error ?? "Upload failed."); }
    };
    xhr.onerror = () => { setPct(null); setErr("Network error. Please try again."); };
    let fake = 70; const tick = setInterval(() => { fake = Math.min(fake + 3, 95); setPct((p) => (p !== null && p >= 70 && p < 100 ? fake : p)); if (fake >= 95) clearInterval(tick); }, 400);
    xhr.onloadend = () => clearInterval(tick);
    xhr.send(fd);
  }

  async function submitPaste() {
    setErr(null); setPct(40); setStage("Structuring your experience…");
    const r = await fetch("/api/resumes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, title: "Pasted resume" }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) router.push(`/resume/${d.id}`); else { setPct(null); setErr(d.error ?? "Could not process text."); }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
        className={cx("relative grid place-items-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center transition", drag ? "border-cyan-300 bg-cyan-500/10" : "border-white/15 bg-white/[0.02] hover:border-violet-400/50")}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.15),transparent_60%)]" />
        {pct === null ? (
          <div className="relative">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20 ring-1 ring-white/10"><UploadCloud className="text-cyan-200" /></div>
            <p className="font-semibold">Drag & drop your resume</p>
            <p className="mt-1 text-sm text-slate-400">PDF, DOCX, or TXT · up to 5 MB</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-primary" onClick={() => input.current?.click()}><FileText size={16} />Choose file</button>
              <button type="button" className="btn-ghost" onClick={() => setPaste(!paste)}><ClipboardPaste size={16} />Paste text instead</button>
            </div>
            <input ref={input} type="file" accept={ACCEPT} className="sr-only" aria-label="Upload resume file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </div>
        ) : (
          <div className="relative w-full max-w-sm" aria-live="polite"><Loader2 className="mx-auto mb-3 animate-spin text-cyan-300" /><Progress value={pct} label={stage} /></div>
        )}
      </div>
      {paste && pct === null && (
        <div className="glass space-y-3 p-4">
          <label htmlFor="paste" className="label">Paste resume text</label>
          <textarea id="paste" className="input min-h-[200px] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your resume here…" />
          <button className="btn-primary" disabled={text.trim().length < 30} onClick={submitPaste}>Process text</button>
        </div>
      )}
      {err && <ErrorBox>{err}</ErrorBox>}
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><Lock size={12} />Encrypted in transit and at rest. Never used for AI training unless you opt in.</p>
    </div>
  );
}
