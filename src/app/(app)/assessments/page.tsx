import Link from "next/link";
import { eq } from "drizzle-orm";
import { Calculator, BookOpenText, Users, Headphones, Cpu, Keyboard, Mic, ArrowRight } from "lucide-react";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { MODULES } from "@/content/assessments";
import { Notice, PageHeader } from "@/components/ui";

const ICONS: Record<string, typeof Cpu> = { numerical: Calculator, verbal: BookOpenText, situational: Users, "customer-service": Headphones, technical: Cpu, typing: Keyboard, "mock-interview": Mic };
export const metadata = { title: "Assessment Academy" };
export default async function Assessments() {
  const u = await requirePageUser();
  const attempts = await db.select().from(schema.assessmentAttempts).where(eq(schema.assessmentAttempts.userId, u.id));
  return (
    <>
      <PageHeader kicker="Job Assessment Academy" title="Practice the tests employers use" subtitle="Original practice questions with an explanation for every answer. Your progress is tracked privately." />
      <div className="mb-6"><Notice tone="amber">For practice only. Please don&apos;t use EqualPath during a live employer assessment. If a test isn&apos;t accessible to you, you have the right to request a reasonable accommodation.</Notice></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{MODULES.map((m) => {
        const mine = attempts.filter((a) => a.module === m.id);
        const best = mine.length ? Math.max(...mine.map((a) => Math.round((a.score / a.total) * 100))) : null;
        const Icon = ICONS[m.id] ?? Cpu;
        return (
          <Link key={m.id} href={`/assessments/${m.id}`} className="glass glass-hover group flex flex-col p-6">
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-500/10 text-cyan-200 ring-1 ring-white/10"><Icon size={20} /></div>
            <h2 className="font-semibold">{m.title}</h2><p className="mt-1 flex-1 text-sm text-slate-400">{m.blurb}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>~{m.minutes} min · {mine.length} attempt{mine.length === 1 ? "" : "s"}{best !== null && m.kind !== "interview" ? ` · best ${best}%` : ""}</span><ArrowRight size={14} className="transition group-hover:translate-x-1 group-hover:text-cyan-300" /></div>
          </Link>);
      })}</div>
    </>
  );
}
