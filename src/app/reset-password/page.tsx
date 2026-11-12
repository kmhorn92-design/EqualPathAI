import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/PasswordReset";
export const metadata = { title: "Choose a new password", referrer: "no-referrer" };
export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AuthShell title="Choose a new password" subtitle="Pick something you haven't used here before."><ResetForm token={token ?? ""} /></AuthShell>;
}
