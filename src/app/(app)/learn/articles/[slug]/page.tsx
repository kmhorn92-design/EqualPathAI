import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { DemoBadge } from "@/components/ui";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await db.query.articles.findFirst({ where: and(eq(schema.articles.slug, (await params).slug), eq(schema.articles.status, "APPROVED")) });
  if (!a) notFound();
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/learn" className="text-sm text-slate-400 hover:text-white">← Learning Hub</Link>
      <div className="mt-6 flex gap-2"><span className="chip">{a.category}</span>{a.isDemo && <DemoBadge />}</div>
      <h1 className="mt-3 text-4xl font-semibold">{a.title}</h1><p className="mt-3 text-lg text-slate-400">{a.summary}</p>
      <div className="prose-ep mt-8">{a.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>
      {a.sourceUrl && <p className="mt-6 text-sm">Source: <a className="text-cyan-300 underline" href={a.sourceUrl} target="_blank" rel="noopener noreferrer">{a.sourceUrl}</a></p>}
    </article>
  );
}
