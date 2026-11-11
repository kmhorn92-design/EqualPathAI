import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";
import { PrivacyControls } from "@/components/PrivacyControls";

export const metadata = { title: "Privacy & settings" };
export default async function Settings() {
  const u = await requirePageUser();
  const [p, c] = await Promise.all([db.query.profiles.findFirst({ where: eq(schema.profiles.userId, u.id) }), db.query.consents.findFirst({ where: eq(schema.consents.userId, u.id) })]);
  return (
    <>
      <PageHeader kicker="Settings" title="Privacy & profile" subtitle="You control your data: consent, retention, export and deletion." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><ProfileForm mode="settings" initial={{ targetRoles: p?.targetRoles ?? [], industries: p?.industries ?? [], location: p?.location ?? "", workPreference: p?.workPreference ?? "UNKNOWN", experienceLevel: p?.experienceLevel ?? "", education: p?.education ?? "", skills: p?.skills ?? [], accessibility: p?.accessibility ?? {} }} /></Card>
        <PrivacyControls initial={{ aiProcessing: c?.aiProcessing ?? true, trainingUse: c?.trainingUse ?? false, retentionDays: c?.retentionDays ?? 365 }} />
      </div>
    </>
  );
}
