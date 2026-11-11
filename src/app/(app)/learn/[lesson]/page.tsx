import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getLesson, LESSONS } from "@/content/lessons";
import { Card } from "@/components/ui";
import { LessonQuiz } from "@/components/learn/LessonQuiz";

export default async function LessonPage({ params }: { params: Promise<{ lesson: string }> }) {
  const l = getLesson((await params).lesson);
  if (!l) notFound();
  const u = await getUser();
  const idx = LESSONS.findIndex((x) => x.id === l.id); const next = LESSONS[idx + 1];
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/learn" className="text-sm text-slate-400 hover:text-white">← Learning Hub</Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{l.track} · {l.minutes} min</p>
      <h1 className="mt-2 text-4xl font-semibold">{l.title}</h1>
      <p className="mt-3 text-lg text-slate-400">{l.summary}</p>
      <div className="prose-ep mt-8">{l.sections.map((s) => (
        <section key={s.h}><h3>{s.h}</h3>{s.body.map((b, i) => <p key={i}>{b}</p>)}{s.bullets && <ul>{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}</section>))}</div>
      <Card className="mt-8"><h2 className="mb-4 text-lg font-semibold">Check your understanding</h2><LessonQuiz lessonId={l.id} quiz={l.quiz.map(({ q, options }) => ({ q, options }))} signedIn={!!u} /></Card>
      <Card className="mt-6"><h2 className="mb-3 font-semibold">Sources & further reading</h2>
        <ul className="space-y-2 text-sm">{l.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-cyan-300 hover:underline">{s.label}<ExternalLink size={12} /></a></li>)}</ul></Card>
      {next && <Link href={`/learn/${next.id}`} className="btn-ghost mt-6">Next: {next.title} →</Link>}
    </article>
  );
}
