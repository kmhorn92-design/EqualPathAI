import clsx from "clsx";
import type { ReactNode } from "react";
import { Inbox, AlertTriangle, Loader2 } from "lucide-react";

export const cx = clsx;

export function Card({ className, children, hover }: { className?: string; children: ReactNode; hover?: boolean }) {
  return <div className={cx("glass p-5", hover && "glass-hover", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, kicker, actions }: { title: string; subtitle?: ReactNode; kicker?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="animate-fadeup">
        {kicker && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{kicker}</p>}
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, body, action, icon }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-violet-500/10 text-violet-300">{icon ?? <Inbox size={22} />}</div>
      <h3 className="font-semibold">{title}</h3>
      {body && <p className="mt-1 max-w-md text-sm text-slate-400">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-100"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{children}</div>;
}

export function Notice({ children, tone = "violet" }: { children: ReactNode; tone?: "violet" | "amber" | "cyan" }) {
  const c = { violet: "border-violet-400/25 bg-violet-500/[0.07] text-violet-100", amber: "border-amber-400/25 bg-amber-500/[0.07] text-amber-100", cyan: "border-cyan-400/25 bg-cyan-500/[0.07] text-cyan-100" }[tone];
  return <div className={cx("rounded-xl border px-4 py-3 text-sm", c)}>{children}</div>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <span className="inline-flex items-center gap-2 text-sm text-slate-400" role="status"><Loader2 size={16} className="animate-spin" />{label}</span>;
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl" />
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">{label}{icon}</div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

export function Progress({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      {label && <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{label}</span><span>{pct}%</span></div>}
      <div className="h-2 overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DemoBadge() {
  return <span className="chip-amber" title="Development seed data — not real">DEMO</span>;
}
