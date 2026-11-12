import { AppNav } from "@/components/AppNav";
import { getUser } from "@/lib/auth";
import { coachForUser } from "@/lib/bookings-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const isCoach = user ? !!(await coachForUser(user.id)) : false;
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="pointer-events-none fixed -top-40 left-1/3 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
      <AppNav user={user ? { name: user.name, email: user.email, role: user.role, isCoach } : null} />
      <main id="main" className="relative px-4 pb-28 pt-8 lg:ml-72 lg:px-10 lg:py-10"><div className="mx-auto max-w-6xl">{children}</div></main>
    </div>
  );
}
