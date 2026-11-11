import { Logo } from "../Logo";
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main id="main" className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 grid-bg [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-[700px] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[120px]" />
      <div className="relative w-full max-w-md animate-fadeup">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="glass p-7"><h1 className="text-2xl font-semibold">{title}</h1><p className="mb-6 mt-1 text-sm text-slate-400">{subtitle}</p>{children}</div>
      </div>
    </main>
  );
}
