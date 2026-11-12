import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";

/** "Tailor my resume" entry point from a job listing: opens the user's most recent resume on the Tailor tab. */
export default async function TailorEntry({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const u = await requirePageUser();
  const { job } = await searchParams;
  const [latest] = await db.select({ id: schema.resumes.id }).from(schema.resumes).where(eq(schema.resumes.userId, u.id)).orderBy(desc(schema.resumes.updatedAt)).limit(1);
  const q = job ? `?job=${encodeURIComponent(job)}` : "";
  redirect(latest ? `/resume/${latest.id}${q}` : `/resume${q}`);
}
