"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, FileText, LayoutTemplate, MessageSquareText, ClipboardCheck, GraduationCap, Scale, Users, Briefcase,
  KanbanSquare, Shield, Settings, Menu, X, Bell, LogOut,
} from "lucide-react";
import { Logo } from "./Logo";
import { cx } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, auth: true },
  { href: "/resume", label: "Resume Studio", icon: FileText, auth: true },
  { href: "/templates", label: "ATS Templates", icon: LayoutTemplate },
  { href: "/jobs", label: "Job Board", icon: Briefcase },
  { href: "/tracker", label: "Applications", icon: KanbanSquare, auth: true },
  { href: "/coach", label: "AI Career Coach", icon: MessageSquareText, auth: true },
  { href: "/assessments", label: "Assessment Academy", icon: ClipboardCheck, auth: true },
  { href: "/learn", label: "Learning Hub", icon: GraduationCap },
  { href: "/fair-hiring", label: "Fair Hiring", icon: Scale },
  { href: "/coaches", label: "Coach Directory", icon: Users },
];

type N = { id: string; title: string; body: string; href: string | null; readAt: string | null };

export function AppNav({ user }: { user: { name: string | null; email: string; role: string } | null }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<N[]>([]);
  const [bell, setBell] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications").then((r) => (r.ok ? r.json() : { items: [] })).then((d) => setNotes(d.items ?? [])).catch(() => {});
  }, [user, path]);
  const unread = notes.filter((n) => !n.readAt).length;
  const markRead = async () => { setBell((b) => !b); if (unread) { await fetch("/api/notifications", { method: "POST" }); setNotes((ns) => ns.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))); } };

  const items = NAV.filter((n) => user || !n.auth);
  const links = (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={cx("group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition", active ? "bg-gradient-to-r from-violet-500/20 to-cyan-500/5 text-white shadow-[inset_0_0_0_1px_rgba(139,92,246,.35)]" : "text-slate-400 hover:bg-white/[0.04] hover:text-white")}>
            <Icon size={17} className={cx(active ? "text-cyan-300" : "text-slate-500 group-hover:text-violet-300")} />{label}
          </Link>
        );
      })}
      {user?.role === "ADMIN" && (
        <Link href="/admin" className={cx("mt-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm", path.startsWith("/admin") ? "bg-amber-500/15 text-amber-100" : "text-amber-300/80 hover:bg-amber-500/10")}>
          <Shield size={17} />Admin
        </Link>
      )}
    </nav>
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.06] bg-ink/80 px-4 backdrop-blur-xl lg:hidden">
        <Logo href={user ? "/dashboard" : "/"} />
        <button className="btn-ghost px-2.5" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
      </header>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cx("fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/[0.06] bg-ink-800/95 p-4 backdrop-blur-xl transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="mb-6 hidden px-2 pt-2 lg:block"><Logo href={user ? "/dashboard" : "/"} /></div>
        <div className="mt-14 flex-1 overflow-y-auto lg:mt-0">{links}</div>
        {user ? (
          <div className="relative mt-4 border-t border-white/[0.06] pt-4">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-semibold">{(user.name ?? user.email)[0]?.toUpperCase()}</div>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{user.name ?? "Member"}</div><div className="truncate text-xs text-slate-500">{user.email}</div></div>
              <button onClick={markRead} className="relative rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
                <Bell size={17} />{unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-cyan-400" />}
              </button>
            </div>
            {bell && (
              <div className="glass absolute bottom-16 left-0 right-0 max-h-80 overflow-y-auto p-2 text-sm">
                {notes.length === 0 ? <p className="p-3 text-slate-400">No notifications yet.</p> : notes.map((n) => (
                  <Link key={n.id} href={n.href ?? "#"} className="block rounded-lg p-2.5 hover:bg-white/5"><div className="font-medium">{n.title}</div><div className="text-xs text-slate-400">{n.body}</div></Link>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Link href="/settings" className="btn-ghost flex-1 py-2 text-xs"><Settings size={14} />Privacy & settings</Link>
              <form action="/api/auth/logout" method="post"><button className="btn-ghost py-2 text-xs" aria-label="Sign out"><LogOut size={14} /></button></form>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-4"><Link href="/login" className="btn-ghost flex-1">Sign in</Link><Link href="/signup" className="btn-primary flex-1">Join free</Link></div>
        )}
      </aside>
    </>
  );
}
