import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { getModule } from "@/content/assessments";
import { PageHeader } from "@/components/ui";
import { Quiz } from "@/components/assess/Quiz";
import { Typing } from "@/components/assess/Typing";
import { Interview } from "@/components/assess/Interview";

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  await requirePageUser();
  const m = getModule((await params).module);
  if (!m) notFound();
  return (
    <>
      <Link href="/assessments" className="mb-4 inline-block text-sm text-slate-400 hover:text-white">← All modules</Link>
      <PageHeader kicker="Practice" title={m.title} subtitle={m.blurb} />
      {m.kind === "mcq" && <Quiz module={m.id} questions={m.questions!.map(({ id, q, options }) => ({ id, q, options }))} />}
      {m.kind === "typing" && <Typing passages={m.passages!} />}
      {m.kind === "interview" && <Interview prompts={m.prompts!} />}
    </>
  );
}
