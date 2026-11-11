import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { Card, Empty, Notice, PageHeader } from "@/components/ui";
import { Uploader } from "@/components/resume/Uploader";

export const metadata = { title: "Resume Studio" };
export default async function ResumeHome() {
  const u = await requirePageUser();
  const rows = await db.select({ id: schema.resumes.id, title: schema.resumes.title, originalName: schema.resumes.originalName, updatedAt: schema.resumes.updatedAt })
    .from(schema.resumes).where(eq(schema.resumes.userId, u.id)).orderBy(desc(schema.resumes.updatedAt));
  return (
    <>
      <PageHeader kicker="AI Resume Studio" title="Truthful resumes that machines can read" subtitle="Upload your resume, review every extracted field, compare it to a job description, and approve each suggested change." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Uploader />
          <Notice tone="cyan">Different employers set up their applicant tracking systems differently. We can&apos;t promise a resume will pass any of them, and we don&apos;t show a made-up &ldquo;ATS score.&rdquo; We help you be clear, truthful and readable.</Notice>
        </div>
        <Card>
          <h2 className="mb-3 font-semibold">Your resumes</h2>
          {rows.length ? <ul className="space-y-2">{rows.map((r) => (
            <li key={r.id}><Link href={`/resume/${r.id}`} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-violet-400/40">
              <FileText size={18} className="text-violet-300" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{r.title}</div><div className="text-xs text-slate-500">Updated {r.updatedAt.toLocaleDateString()}{r.originalName && ` · ${r.originalName}`}</div></div></Link></li>))}</ul>
            : <Empty title="No resumes yet" body="Upload one to get started. Don't have a resume? Paste whatever you have, or start from a template." action={<Link href="/templates" className="btn-ghost">Browse templates</Link>} />}
        </Card>
      </div>
    </>
  );
}
