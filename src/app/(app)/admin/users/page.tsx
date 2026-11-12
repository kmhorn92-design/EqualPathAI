import Link from "next/link";
import { and, count, desc, eq, gte, ilike, isNotNull, isNull, like, or, type SQL } from "drizzle-orm";
import { Search } from "lucide-react";
import { db, schema } from "@/db";
import { isOwnerEmail, ownerConfigured, requirePageAdmin } from "@/lib/auth";
import { Card, PageHeader, Stat, cx } from "@/components/ui";
import { UserActions } from "@/components/admin/AdminControls";

export const metadata = { title: "Admin · Users" };
export const dynamic = "force-dynamic";
const PAGE = 25;

const when = (d: Date | null) => {
  if (!d) return "—";
  const h = (Date.now() - d.getTime()) / 36e5;
  return h < 1 ? "just now" : h < 24 ? `${Math.round(h)}h ago` : h < 24 * 30 ? `${Math.round(h / 24)}d ago` : d.toLocaleDateString();
};

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }> }) {
  const me = await requirePageAdmin();
  const sp = await searchParams;
  const u = schema.users;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: SQL[] = [];
  const q = sp.q?.trim().slice(0, 100);
  if (q) where.push(or(ilike(u.email, `%${q}%`), ilike(u.name, `%${q}%`))!);
  if (sp.role === "ADMIN" || sp.role === "USER") where.push(eq(u.role, sp.role));
  if (sp.status === "suspended") where.push(isNotNull(u.suspendedAt));
  if (sp.status === "active") where.push(isNull(u.suspendedAt));
  const cond = where.length ? and(...where) : undefined;
  const week = new Date(Date.now() - 7 * 864e5);

  const [[{ total }], rows, [{ all }], [{ admins }], [{ suspended }], [{ active7 }], log] = await Promise.all([
    db.select({ total: count() }).from(u).where(cond),
    db.select({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt, lastActiveAt: u.lastActiveAt, onboardedAt: u.onboardedAt, suspendedAt: u.suspendedAt, suspendedReason: u.suspendedReason })
      .from(u).where(cond).orderBy(desc(u.createdAt)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ all: count() }).from(u),
    db.select({ admins: count() }).from(u).where(eq(u.role, "ADMIN")),
    db.select({ suspended: count() }).from(u).where(isNotNull(u.suspendedAt)),
    db.select({ active7: count() }).from(u).where(gte(u.lastActiveAt, week)),
    db.select().from(schema.auditLogs).where(like(schema.auditLogs.action, "user.%")).orderBy(desc(schema.auditLogs.createdAt)).limit(10),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const iAmOwner = isOwnerEmail(me.email);
  const canManageAdmins = iAmOwner || !ownerConfigured();
  const roleChip = (r: { email: string; role: string }) => isOwnerEmail(r.email) ? <span className="chip-violet">Owner</span> : r.role === "ADMIN" ? <span className="chip-amber">Admin</span> : <span className="text-slate-400">User</span>;
  const link = (p: Record<string, string | undefined>) => "/admin/users?" + new URLSearchParams(Object.entries({ q, role: sp.role, status: sp.status, ...p }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader kicker="Admin" title="Users" subtitle="Account status and access only. Admins never see resumes, coach chats, or applications from here." />
      <p className="-mt-2 mb-5 text-sm text-slate-400">{!ownerConfigured()
        ? <>No owner is set yet, so every admin can give admin access. Set <code>OWNER_EMAIL</code> in your hosting settings to lock that to one person.</>
        : iAmOwner ? <>You&apos;re the <b className="text-violet-200">owner</b>. Only you can give or remove admin access, and no one else can change, suspend or sign out your account.</>
        : <>Only the owner can give or remove admin access or change another admin&apos;s account.</>}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Accounts" value={all} />
        <Stat label="Active (7 days)" value={active7} />
        <Stat label="Admins" value={admins} />
        <Stat label="Suspended" value={suspended} />
      </div>

      <Card className="mt-6">
        <form className="flex flex-wrap items-end gap-3" action="/admin/users">
          <label className="min-w-[220px] flex-1 text-sm"><span className="mb-1 block text-xs text-slate-400">Search name or email</span>
            <span className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input name="q" defaultValue={q} className="input pl-8" placeholder="e.g. kiara or @gmail.com" /></span></label>
          <label className="min-w-0 max-w-full text-sm"><span className="mb-1 block text-xs text-slate-400">Role</span>
            <select name="role" defaultValue={sp.role ?? ""} className="input w-full sm:w-auto"><option value="">Any</option><option value="USER">User</option><option value="ADMIN">Admin</option></select></label>
          <label className="min-w-0 max-w-full text-sm"><span className="mb-1 block text-xs text-slate-400">Status</span>
            <select name="status" defaultValue={sp.status ?? ""} className="input w-full sm:w-auto"><option value="">Any</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
          <button className="btn-primary">Filter</button>
          {(q || sp.role || sp.status) && <Link href="/admin/users" className="btn-ghost">Clear</Link>}
        </form>
      </Card>

      <Card className="mt-6 overflow-x-auto">
        <p className="mb-3 text-sm text-slate-400">{total} account{total === 1 ? "" : "s"}</p>
        <ul className="space-y-3 sm:hidden">{rows.map((r) => (
          <li key={r.id} className={cx("rounded-xl border border-white/10 p-3", r.suspendedAt && "border-rose-400/30 bg-rose-500/[0.04]")}>
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="font-medium">{r.name || "—"}</div><div className="break-all text-xs text-slate-400">{r.email}</div></div>{r.role === "ADMIN" && <span className="shrink-0">{roleChip(r)}</span>}</div>
            <div className="mt-2 text-xs text-slate-400">Joined {r.createdAt.toLocaleDateString()} · Active {when(r.lastActiveAt)} · {r.suspendedAt ? <span className="text-rose-300">Suspended{r.suspendedReason ? `: ${r.suspendedReason}` : ""}</span> : r.onboardedAt ? <span className="text-emerald-300">Active</span> : "Not onboarded"}</div>
            <div className="mt-2"><UserActions id={r.id} email={r.email} role={r.role} suspended={!!r.suspendedAt} self={r.id === me.id} owner={isOwnerEmail(r.email)} canManageAdmins={canManageAdmins} /></div>
          </li>))}</ul>
        <table className="hidden w-full min-w-[860px] text-sm sm:table">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-2">Person</th><th>Role</th><th>Joined</th><th>Last active</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className={cx("border-t border-white/5 align-top", r.suspendedAt && "bg-rose-500/[0.04]")}>
              <td className="py-3"><div className="font-medium">{r.name || "—"}</div><div className="text-xs text-slate-400">{r.email}</div></td>
              <td className="py-3">{roleChip(r)}</td>
              <td className="py-3 text-xs text-slate-400">{r.createdAt.toLocaleDateString()}</td>
              <td className="py-3 text-xs text-slate-400">{when(r.lastActiveAt)}</td>
              <td className="py-3 text-xs">{r.suspendedAt
                ? <span className="text-rose-300" title={r.suspendedReason ?? ""}>Suspended {r.suspendedAt.toLocaleDateString()}{r.suspendedReason && <span className="block max-w-[200px] truncate text-slate-500">{r.suspendedReason}</span>}</span>
                : r.onboardedAt ? <span className="text-emerald-300">Active</span> : <span className="text-slate-400">Signed up, not onboarded</span>}</td>
              <td className="py-3"><UserActions id={r.id} email={r.email} role={r.role} suspended={!!r.suspendedAt} self={r.id === me.id} owner={isOwnerEmail(r.email)} canManageAdmins={canManageAdmins} /></td>
            </tr>))}</tbody>
        </table>
        {rows.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No accounts match.</p>}
        {pages > 1 && <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link className="btn-ghost" href={link({ page: String(page - 1) })}>← Previous</Link> : <span />}
          <span className="text-slate-400">Page {page} of {pages}</span>
          {page < pages ? <Link className="btn-ghost" href={link({ page: String(page + 1) })}>Next →</Link> : <span />}</div>}
      </Card>

      <Card className="mt-6">
        <h2 className="mb-3 font-semibold">Recent account actions</h2>
        {log.length === 0 ? <p className="text-sm text-slate-400">No admin actions on accounts yet.</p> : (
          <ul className="divide-y divide-white/5 text-sm">{log.map((l) => { const d = l.detail as { email?: string; reason?: string }; return (
            <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2"><span><b className="text-white">{l.action.replace("user.", "")}</b> {d.email}{d.reason && <span className="text-slate-400"> · {d.reason}</span>}</span><span className="text-xs text-slate-500">{l.actor.replace("admin:", "")} · {l.createdAt.toLocaleString()}</span></li>); })}</ul>)}
      </Card>
    </>
  );
}
