import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { getUser } from "@/lib/auth";
export const metadata = { title: "Sign in" };
export default async function Login() {
  if (await getUser()) redirect("/dashboard");
  return <AuthShell title="Welcome back" subtitle="Pick up where you left off."><AuthForm mode="login" /></AuthShell>;
}
