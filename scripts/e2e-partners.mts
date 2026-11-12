// E2E: hiring partners (consent & agreement gating, contact visibility) and the site assistant.
import "./env";
import { eq } from "drizzle-orm";
import { db, schema, pool } from "../src/db";
const B = process.env.BASE ?? "http://localhost:3100";
const ok = (c: boolean, m: string) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) process.exitCode = 1; };
function client() {
  let cookie = "";
  const j = async (path: string, init: RequestInit = {}) => {
    const r = await fetch(B + path, { ...init, redirect: "manual", headers: { ...(typeof init.body === "string" ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) } });
    const sc = r.headers.get("set-cookie"); if (sc?.startsWith("ep_session=")) cookie = sc.split(";")[0];
    const t = await r.text(); let d: any; try { d = JSON.parse(t); } catch { d = t; } return { s: r.status, d };
  };
  return { j };
}
const anon = client();
const list = await anon.j("/partners"); ok(list.s === 200 && String(list.d).includes("DEMO Northwind Health"), "partners page lists published partners");
const slug = (await db.query.partners.findFirst({ where: eq(schema.partners.name, "DEMO Northwind Health") }))!.slug;
const pageAnon = await anon.j(`/partners/${slug}`);
ok(pageAnon.s === 200 && String(pageAnon.d).includes("Alicia Moreno"), "partner page shows recruiter names publicly");
{ const leaks = ["alicia.moreno@", "010-2041"].filter((x) => String(pageAnon.d).includes(x)); ok(leaks.length === 0, `email & phone hidden when signed out${leaks.length ? ` (found: ${leaks})` : ""}`); }

const user = client();
await user.j("/api/auth/signup", { method: "POST", body: JSON.stringify({ name: "Pat", email: `pat${Date.now()}@example.com`, password: "correcthorse9", acceptTerms: true }) });
await user.j("/api/profile", { method: "PUT", body: JSON.stringify({ targetRoles: ["Support"] }) });
const pageUser = await user.j(`/partners/${slug}`);
ok(String(pageUser.d).includes("alicia.moreno@northwind-demo.example.com") && String(pageUser.d).includes("(555) 010-2041"), "signed-in users see recruiter email & phone");
ok(String(pageUser.d).includes("Phone not listed"), "recruiter without a phone shows email-only");
ok((await user.j("/api/admin/partners", { method: "POST", body: JSON.stringify({ name: "Sneaky Co", industry: "Tech", description: "Trying to add myself as a partner without permission." }) })).s === 403, "non-admins can't add partners");

const admin = client();
await admin.j("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@equalpath.local", password: "AdminPass12345" }) });
const draft = await admin.j("/api/admin/partners", { method: "POST", body: JSON.stringify({ name: `Test Partner ${Date.now()}`, industry: "Logistics", description: "A test partner created by the E2E suite for verification.", workModes: ["ONSITE"] }) });
ok(draft.s === 200 && draft.d.status === "PENDING", "partner without confirmed agreement is saved as a draft");
{ const r = await anon.j(`/partners/${draft.d.slug}`); ok(!String(r.d).includes("A test partner created by the E2E suite"), "draft partner is not publicly visible"); }
ok((await admin.j(`/api/admin/partners/${draft.d.id}`, { method: "PATCH", body: JSON.stringify({ status: "APPROVED" }) })).s === 400, "can't publish without confirming an agreement");
ok((await admin.j(`/api/admin/partners/${draft.d.id}/recruiters`, { method: "POST", body: JSON.stringify({ name: "No Consent", title: "Recruiter", email: "nc@example.com" }) })).s === 400, "recruiter contact can't be added without consent");
const rec = await admin.j(`/api/admin/partners/${draft.d.id}/recruiters`, { method: "POST", body: JSON.stringify({ name: "Taylor Test", title: "Recruiter", email: "taylor@example.com", phone: "(555) 010-9999", consentConfirmed: true }) });
ok(rec.s === 200, "recruiter added with documented consent");
ok((await admin.j(`/api/admin/partners/${draft.d.id}`, { method: "PATCH", body: JSON.stringify({ agreementConfirmed: true, status: "APPROVED" }) })).s === 200, "admin confirms agreement and publishes");
const live = await user.j(`/partners/${draft.d.slug}`); ok(live.s === 200 && String(live.d).includes("taylor@example.com"), "published partner + recruiter visible");
await admin.j(`/api/admin/recruiters/${rec.d.id}`, { method: "PATCH", body: JSON.stringify({ active: false }) });
ok(!String((await user.j(`/partners/${draft.d.slug}`)).d).includes("taylor@example.com"), "hidden recruiter disappears immediately");
await admin.j(`/api/admin/recruiters/${rec.d.id}`, { method: "DELETE" });
ok(!(await db.query.recruiters.findFirst({ where: eq(schema.recruiters.id, rec.d.id) })), "removed recruiter's contact details are deleted");
await admin.j(`/api/admin/partners/${draft.d.id}`, { method: "DELETE" });
ok((await admin.j("/admin")).s === 200, "admin dashboard renders with partner management");
ok((await anon.j("/")).s === 200 && String((await anon.j("/")).d).includes("Talk to recruiters who are hiring"), "landing shows hiring partners");

const a1 = await anon.j("/api/assistant", { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "How do I find remote jobs?" }] }) });
ok(a1.s === 200 && a1.d.links[0].href === "/jobs" && a1.d.answer.includes("Remote"), `assistant answers signed-out visitors (${a1.d.source})`);
const a2 = await anon.j("/api/assistant", { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "Can I talk to a recruiter?" }] }) });
ok(a2.d.links[0].href === "/partners", "assistant points recruiter questions to Hiring Partners");
ok((await anon.j("/api/assistant", { method: "POST", body: JSON.stringify({ messages: [] }) })).s === 400, "assistant validates input");
await pool.end();
