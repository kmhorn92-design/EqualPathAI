import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { getUser } from "@/lib/auth";
export const metadata = { title: "Create account" };
export default async function Signup() {
  if (await getUser()) redirect("/dashboard");
  return <AuthShell title="Create your free account" subtitle="No demographic questions. Your data stays yours."><AuthForm mode="signup" /></AuthShell>;
}
