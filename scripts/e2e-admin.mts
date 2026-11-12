// E2E: admin side — user management, job moderation, source pause, analytics; and that non-admins are locked out.
import "./env";
import { eq } from "drizzle-orm";
import { db, schema, pool } from "../src/db";
const B = process.env.BASE ?? "http://localhost:3100";
const ok = (c: boolean, m: string) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) process.exitCode = 1; };
function client() {
  let cookie = "";
  const j = async (path: string, init: RequestInit = {}) => {
    const r = await fetch(B + path, { ...init, redirect: "manual", headers: { ...(typeof init.body === "string" ? { "content-type": "application/json", origin: B } : {}), ...(cookie ? { cookie } : {}) } });
    const sc = r.headers.get("set-cookie"); if (sc?.startsWith("ep_session=")) cookie = sc.split(";")[0];
    const t = await r.text(); let d: any; try { d = JSON.parse(t); } catch { d = t; } return { s: r.status, d };
  };
  return { j, reset: () => { cookie = ""; } };
}
const post = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) });
const patch = (body: unknown) => ({ method: "PATCH", body: JSON.stringify(body) });

const admin = client();
ok((await admin.j("/api/auth/login", post({ email: "admin@equalpath.local", password: "AdminPass12345" }))).s === 200, "admin signs in on the normal login page");
const me = (await db.query.users.findFirst({ where: eq(schema.users.email, "admin@equalpath.local") }))!;

// Regular user
const email = `sam${Date.now()}@example.com`;
const user = client();
await user.j("/api/auth/signup", post({ name: "Sam Rivera", email, password: "correcthorse9", acceptTerms: true }));
const sam = (await db.query.users.findFirst({ where: eq(schema.users.email, email) }))!;
for (const p of ["/admin", "/admin/users", "/admin/jobs", "/admin/analytics"]) {
  const r = await user.j(p); const t = String(r.d);
  ok(/NEXT_REDIRECT|^$/.test(t) || r.s === 307, `non-admin is redirected away from ${p}`);
  ok(!["Operations dashboard", "Recent account actions", "Job board controls", "All tracked activity", "admin@equalpath.local"].some((x) => t.includes(x)), `no admin data in the response for ${p}`);
}
ok((await user.j(`/api/admin/users/${me.id}`, patch({ action: "demote" }))).s === 403, "non-admin can't call user admin API");

// Pages render
for (const p of ["/admin", "/admin/users", "/admin/jobs", "/admin/analytics", "/admin/analytics?days=7", `/admin/users?q=${encodeURIComponent(email)}`, "/admin/jobs?show=all"]) {
  const r = await admin.j(p); ok(r.s === 200, `${p} renders for admins`);
}
ok(String((await admin.j(`/admin/users?q=${encodeURIComponent(email)}`)).d).includes(email), "user search finds the account");

// User management
ok((await admin.j(`/api/admin/users/${me.id}`, patch({ action: "demote" }))).s === 400, "admins can't demote themselves");
ok((await admin.j(`/api/admin/users/${sam.id}`, patch({ action: "suspend", reason: "" }))).s === 400, "suspending requires a reason");
ok((await admin.j(`/api/admin/users/${sam.id}`, patch({ action: "suspend", reason: "Spam messages to recruiters" }))).s === 200, "admin suspends a user");
ok((await user.j("/api/notifications")).s === 401, "suspended user's session stops working immediately");
user.reset();
const blocked = await user.j("/api/auth/login", post({ email, password: "correcthorse9" }));
ok(blocked.s === 403 && /suspended/i.test(blocked.d.error), "suspended user can't sign in and sees why");
ok((await admin.j(`/api/admin/users/${sam.id}`, patch({ action: "restore" }))).s === 200, "admin restores the user");
ok((await user.j("/api/auth/login", post({ email, password: "correcthorse9" }))).s === 200, "restored user can sign in again");
ok((await admin.j(`/api/admin/users/${sam.id}`, patch({ action: "promote" }))).s === 200 && (await db.query.users.findFirst({ where: eq(schema.users.id, sam.id) }))!.role === "ADMIN", "promote to admin");
// ── Owner rules (dev server runs with OWNER_EMAIL=admin@equalpath.local) ──
await user.j("/api/auth/login", post({ email, password: "correcthorse9" }));
const pat = `pat${Date.now()}@example.com`; const patC = client();
await patC.j("/api/auth/signup", post({ name: "Pat Lee", email: pat, password: "correcthorse9", acceptTerms: true }));
const patU = (await db.query.users.findFirst({ where: eq(schema.users.email, pat) }))!;
ok((await user.j(`/api/admin/users/${patU.id}`, patch({ action: "promote" }))).s === 403, "a non-owner admin can't give admin access");
ok((await user.j(`/api/admin/users/${me.id}`, patch({ action: "demote" }))).s === 403, "a non-owner admin can't demote the owner");
ok((await user.j(`/api/admin/users/${me.id}`, patch({ action: "suspend", reason: "takeover attempt" }))).s === 403, "no one else can suspend the owner");
ok((await user.j(`/api/admin/users/${me.id}`, patch({ action: "signout" }))).s === 403, "no one else can sign the owner out");
ok((await admin.j("/api/auth/me").catch(() => ({ s: 0 }))).s !== 401 && (await admin.j("/admin/users")).s === 200, "owner is still signed in and still admin");
ok((await admin.j(`/api/admin/users/${patU.id}`, patch({ action: "promote" }))).s === 200, "owner gives Pat admin access");
ok((await user.j(`/api/admin/users/${patU.id}`, patch({ action: "suspend", reason: "test" }))).s === 403, "a non-owner admin can't suspend another admin");
ok((await admin.j(`/api/admin/users/${patU.id}`, patch({ action: "demote" }))).s === 200, "owner removes Pat's admin access");
ok((await user.j(`/api/admin/users/${patU.id}`, patch({ action: "suspend", reason: "spam" }))).s === 200 && (await user.j(`/api/admin/users/${patU.id}`, patch({ action: "restore" }))).s === 200, "non-owner admins can still manage regular users");
const ownerPage = String((await admin.j("/admin/users?q=admin%40equalpath.local")).d);
ok(/"children":"Owner"|>Owner</.test(ownerPage) && ownerPage.includes("Only you can give or remove admin access"), "owner sees the Owner badge and explanation");
await db.update(schema.users).set({ onboardedAt: new Date() }).where(eq(schema.users.id, sam.id));
const samPage = String((await user.j(`/admin/users?q=${encodeURIComponent(pat)}`)).d);
ok(samPage.includes("Only the owner can give or remove admin access") && !samPage.includes("canManageAdmins\":true"), "non-owner admins are told only the owner manages admins");
// owner can never be locked out: even a direct DB suspension is lifted when they sign in
await db.update(schema.users).set({ suspendedAt: new Date(), suspendedReason: "x", role: "USER" }).where(eq(schema.users.id, me.id));
const ownerAgain = client();
ok((await ownerAgain.j("/api/auth/login", post({ email: "admin@equalpath.local", password: "AdminPass12345" }))).s === 200 && (await db.query.users.findFirst({ where: eq(schema.users.id, me.id) }))!.role === "ADMIN", "owner always gets back in as admin");
await admin.j("/api/auth/login", post({ email: "admin@equalpath.local", password: "AdminPass12345" }));
ok((await admin.j(`/api/admin/users/${sam.id}`, patch({ action: "demote" }))).s === 200 && (await db.query.users.findFirst({ where: eq(schema.users.id, sam.id) }))!.role === "USER", "remove admin");
ok((await admin.j(`/api/admin/users/${sam.id}`, patch({ action: "signout" }))).s === 200 && (await user.j("/api/notifications")).s === 401, "force sign-out ends sessions");
const log = await db.query.auditLogs.findMany({ where: eq(schema.auditLogs.target, sam.id) });
ok(log.length >= 5 && log.every((l) => l.actor === "admin:admin@equalpath.local"), "every account action is in the audit log");

// Job moderation (use a demo job so this works without live sources)
const job = (await db.query.jobs.findFirst({ where: eq(schema.jobs.isDemo, true) }))!;
const searchHas = async () => String((await admin.j(`/jobs?demo=1&q=${encodeURIComponent(job.title)}`)).d).includes(job.id);
const before = await searchHas();
ok((await admin.j(`/api/admin/jobs/${job.id}`, patch({ action: "hide", reason: "Not a reason" }))).s === 400, "hiding needs a valid reason");
ok((await admin.j(`/api/admin/jobs/${job.id}`, patch({ action: "hide", reason: "Duplicate", note: "same as another post" }))).s === 200, "admin hides a listing");
ok(before && !(await searchHas()), "hidden listing disappears from the job board");
ok(String((await admin.j("/admin/jobs?show=hidden")).d).replace(/<!-- -->/g, "").includes("Duplicate: same as another post"), "hidden listing shows with its reason in admin");
// re-ingesting the source doesn't bring it back
await admin.j("/api/admin/ingest", post({ sourceId: "demo" }));
ok(!!(await db.query.jobs.findFirst({ where: eq(schema.jobs.id, job.id) }))!.hiddenAt, "listing stays hidden after the source re-sends it");
ok((await admin.j(`/api/admin/jobs/${job.id}`, patch({ action: "unhide" }))).s === 200 && (await searchHas()), "admin shows it again");

// Source pause
ok((await admin.j("/api/admin/sources/demo", patch({ paused: true }))).s === 200, "admin pauses a source");
const run = await admin.j("/api/admin/ingest", post({ sourceId: "demo" }));
ok(run.d.results?.[0]?.status === "SKIPPED" && /paused/i.test(run.d.results[0].error), "paused source is skipped");
ok((await admin.j("/api/admin/sources/demo", patch({ paused: false }))).s === 200, "admin resumes the source");
ok((await admin.j("/api/admin/sources/nope", patch({ paused: true }))).s === 404, "unknown source returns 404");

await pool.end();
