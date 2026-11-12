import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/PasswordReset";
export const metadata = { title: "Reset your password" };
export default function Forgot() {
  return <AuthShell title="Forgot your password?" subtitle="Enter your email and we'll send you a link to choose a new one."><ForgotForm /></AuthShell>;
}
