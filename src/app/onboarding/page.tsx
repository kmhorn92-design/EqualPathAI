import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "Get set up" };
export default async function Onboarding() {
  const u = await requirePageUser({ allowUnonboarded: true });
  if (u.onboardedAt) redirect("/dashboard");
  return (
    <AuthShell title={`Welcome${u.name ? `, ${u.name}` : ""}`} subtitle="Three quick steps to personalize your path. Everything is optional.">
      <ProfileForm mode="onboarding" initial={{ targetRoles: [], industries: [], location: "", workPreference: "UNKNOWN", experienceLevel: "", education: "", skills: [], accessibility: {} }} />
    </AuthShell>
  );
}
