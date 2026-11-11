import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { decryptOpt } from "@/lib/crypto";
import { listVersions } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { Tracker, type App } from "@/components/tracker/Tracker";

export const metadata = { title: "Application Tracker" };
export default async function TrackerPage() {
  const u = await requirePageUser();
  const [rows, versions] = await Promise.all([db.select().from(schema.applications).where(eq(schema.applications.userId, u.id)).orderBy(desc(schema.applications.updatedAt)), listVersions(u.id)]);
  const apps: App[] = rows.map((a) => ({ id: a.id, company: a.company, title: a.title, url: a.url, status: a.status, notes: decryptOpt(a.notesEnc), appliedAt: a.appliedAt?.toISOString() ?? null, reminderAt: a.reminderAt?.toISOString() ?? null, resumeVersionId: a.resumeVersionId, updatedAt: a.updatedAt.toISOString(), createdAt: a.createdAt.toISOString() }));
  return (
    <>
      <PageHeader kicker="Application Tracker" title="Every application, one place" subtitle="Drag cards between stages, set reminders, keep encrypted notes, and get follow-up suggestions. You stay in control of every update." />
      <Tracker initial={apps} versions={versions.map((v) => ({ id: v.id, label: `${v.resumeTitle} — ${v.label}` }))} />
    </>
  );
}
