import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { CheckCircle2, Clock, ArrowRight, Newspaper } from "lucide-react";
import { db, schema } from "@/db";
import { getUser } from "@/lib/auth";
import { LESSONS } from "@/content/lessons";
import { Card, DemoBadge, PageHeader, Progress } from "@/components/ui";

export const metadata = { title: "AI Learning Hub" };
export default async function Learn() {
  const u = await getUser();
  const [progress, articles] = await Promise.all([
    u ? db.select().from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, u.id)) : Promise.resolve([]),
    db.select().from(schema.articles).where(and(eq(schema.articles.status, "APPROVED"))).orderBy(desc(schema.articles.createdAt)).limit(12),
  ]);
  const done = progress.filter((p) => p.completed).length;
  return (
    <>
      <PageHeader kicker="AI Learning Hub" title="Understand the systems that screen you" subtitle="Short, interactive lessons on AI literacy, hiring technology, fairness, and safety. Each one links to its sources." />
      {u && <Card className="mb-6"><Progress value={done} max={LESSONS.length} label={`${done} of ${LESSONS.length} lessons complete`} /></Card>}
      <div className="grid gap-4 md:grid-cols-2">{LESSONS.map((l) => { const p = progress.find((x) => x.lessonId === l.id); return (
        <Link key={l.id} href={`/learn/${l.id}`} className="glass glass-hover group p-6">
          <div className="flex items-center justify-between"><span className="chip-violet">{l.track}</span>{p?.completed && <CheckCircle2 size={18} className="text-emerald-300" aria-label="Completed" />}</div>
          <h2 className="mt-3 text-lg font-semibold">{l.title}</h2><p className="mt-1 text-sm text-slate-400">{l.summary}</p>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span className="flex items-center gap-1"><Clock size={12} />{l.minutes} min · {l.quiz.length}-question quiz</span><ArrowRight size={14} className="transition group-hover:translate-x-1" /></div>
        </Link>); })}</div>
      {articles.length > 0 && <>
        <h2 className="mb-4 mt-10 flex items-center gap-2 text-xl font-semibold"><Newspaper size={18} className="text-cyan-300" />Articles</h2>
        <div className="grid gap-3 md:grid-cols-3">{articles.map((a) => (
          <Link key={a.id} href={`/learn/articles/${a.slug}`} className="glass glass-hover p-5"><div className="flex gap-2"><span className="chip">{a.category}</span>{a.isDemo && <DemoBadge />}</div><h3 className="mt-2 font-semibold">{a.title}</h3><p className="mt-1 text-sm text-slate-400">{a.summary}</p></Link>))}</div>
      </>}
    </>
  );
}
