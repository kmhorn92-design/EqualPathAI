// E2E: forgot / reset password (uses the dev mail outbox in ./.dev-mail; run against `next dev` without SMTP settings).
import "./env";
import { readdirSync, readFileSync, rmSync } from "node:fs";
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
  return { j };
}
const post = (b: unknown) => ({ method: "POST", body: JSON.stringify(b) });
rmSync(".dev-mail", { recursive: true, force: true });
const outbox = (to: string) => { try { return readdirSync(".dev-mail").filter((f) => f.includes(to.replace(/[^a-z0-9@.]+/gi, "_"))).sort().map((f) => JSON.parse(readFileSync(`.dev-mail/${f}`, "utf8"))); } catch { return []; } };
const tokenFrom = (m: { text: string }) => decodeURIComponent(m.text.match(/token=([^\s]+)/)![1]);

const email = `reset${Date.now()}@example.com`;
const a = client(); const b = client();
await a.j("/api/auth/signup", post({ name: "Riley", email, password: "oldpassword1", acceptTerms: true }));
await b.j("/api/auth/login", post({ email, password: "oldpassword1" }));
ok((await b.j("/api/notifications")).s === 200, "second device is signed in");

ok(String((await client().j("/login")).d).includes("/forgot-password"), "login page links to Forgot password");
ok((await client().j("/forgot-password")).s === 200 && (await client().j("/reset-password?token=x")).s === 200, "forgot and reset pages load signed out");

const unknown = await client().j("/api/auth/forgot", post({ email: `nobody${Date.now()}@example.com` }));
const known = await client().j("/api/auth/forgot", post({ email: email.toUpperCase() }));
ok(unknown.s === 200 && known.s === 200 && unknown.d.message === known.d.message, "same answer whether or not the account exists");
ok(outbox(`nobody`).length === 0, "no email for unknown addresses");
const mails = outbox(email); ok(mails.length === 1 && /reset-password\?token=/.test(mails[0].text) && mails[0].html.includes("Choose a new password"), "reset email sent with a link");
const row = await db.query.passwordResets.findFirst({ where: eq(schema.passwordResets.tokenHash, tokenFrom(mails[0])) });
ok(!row, "raw token is not stored (only its hash)");

ok((await client().j("/api/auth/reset", post({ token: tokenFrom(mails[0]), password: "short" }))).s === 400, "weak new password rejected");
ok((await client().j("/api/auth/reset", post({ token: "x".repeat(40), password: "newpassword22" }))).s === 400, "bogus token rejected");

// A newer request invalidates the older link
await client().j("/api/auth/forgot", post({ email }));
const m2 = outbox(email); ok(m2.length === 2, "second request sends a fresh link");
ok((await client().j("/api/auth/reset", post({ token: tokenFrom(m2[0]), password: "newpassword22" }))).s === 400, "older link stops working once a newer one is sent");

const c = client();
const done = await c.j("/api/auth/reset", post({ token: tokenFrom(m2[1]), password: "newpassword22" }));
ok(done.s === 200 && done.d.next === "/onboarding", "reset succeeds with the newest link");
ok((await c.j("/api/notifications")).s === 200, "user is signed in after resetting");
ok((await b.j("/api/notifications")).s === 401, "other devices were signed out");
ok((await client().j("/api/auth/reset", post({ token: tokenFrom(m2[1]), password: "anotherpass33" }))).s === 400, "link can't be used twice");
ok((await client().j("/api/auth/login", post({ email, password: "oldpassword1" }))).s === 401, "old password no longer works");
ok((await client().j("/api/auth/login", post({ email, password: "newpassword22" }))).s === 200, "new password works");

// expired link
await client().j("/api/auth/forgot", post({ email }));
const m3 = outbox(email).at(-1);
const u = (await db.query.users.findFirst({ where: eq(schema.users.email, email) }))!;
await db.update(schema.passwordResets).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.passwordResets.userId, u.id));
ok((await client().j("/api/auth/reset", post({ token: tokenFrom(m3), password: "anotherpass33" }))).s === 400, "expired link rejected");

// per-account email cap (3/hour)
for (let i = 0; i < 3; i++) await client().j("/api/auth/forgot", post({ email }));
ok(outbox(email).length === 3, "at most 3 reset emails per account per hour");

rmSync(".dev-mail", { recursive: true, force: true });
await pool.end();
