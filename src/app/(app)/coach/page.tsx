import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { TOPICS } from "@/lib/coach";
import { llmEnabled } from "@/lib/llm";
import { Notice, PageHeader } from "@/components/ui";
import { Coach } from "@/components/coach/Coach";

export const metadata = { title: "AI Career Coach" };
export default async function CoachPage() {
  const u = await requirePageUser();
  const threads = await db.select().from(schema.chatThreads).where(eq(schema.chatThreads.userId, u.id)).orderBy(desc(schema.chatThreads.updatedAt)).limit(30);
  return (
    <>
      <PageHeader kicker="AI Career Coach" title="Guidance that starts from your real skills" subtitle="Roadmaps, transferable skills, salary research with sources, interview and STAR practice, cover letters, and networking." />
      {!llmEnabled() && <div className="mb-5"><Notice tone="amber">AI coaching isn&apos;t configured on this server (set <code>ANTHROPIC_API_KEY</code> or <code>OPENAI_API_KEY</code>). You&apos;ll get standard EqualPath guidance until then.</Notice></div>}
      <Coach topics={Object.entries(TOPICS).map(([id, t]) => ({ id, label: t.label }))} initialThreads={threads.map((t) => ({ id: t.id, topic: t.topic, updatedAt: t.updatedAt.toISOString() }))} />
    </>
  );
}
