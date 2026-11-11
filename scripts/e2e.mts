// End-to-end API walkthrough against a running server.
import { exportPdf, exportDocx } from "../src/lib/resume/export.ts";
import { structureText } from "../src/lib/resume/parse.ts";
const B = process.env.BASE ?? "http://localhost:3100";
let cookie = "";
const ok = (c: boolean, m: string) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) process.exitCode = 1; };
async function req(path: string, init: RequestInit = {}) {
  const r = await fetch(B + path, { ...init, headers: { ...(init.body && typeof init.body === "string" ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...(init.headers ?? {}) }, redirect: "manual" });
  const sc = r.headers.get("set-cookie"); if (sc?.startsWith("ep_session=")) cookie = sc.split(";")[0];
  return r;
}
const j = async (path: string, init: RequestInit = {}) => { const r = await req(path, init); const t = await r.text(); try { return { s: r.status, d: JSON.parse(t) }; } catch { return { s: r.status, d: t }; } };

const email = `e2e${Date.now()}@example.com`;
ok((await j("/api/auth/signup", { method: "POST", body: JSON.stringify({ name: "E2E Tester", email, password: "weak", acceptTerms: true }) })).s === 400, "weak password rejected");
ok((await j("/api/auth/signup", { method: "POST", body: JSON.stringify({ name: "E2E Tester", email, password: "correcthorse9", acceptTerms: true }) })).s === 200, "signup");
ok((await (await req("/dashboard")).text()).includes("/onboarding"), "un-onboarded user redirected to onboarding");
{ const anon = await fetch(B + "/dashboard", { redirect: "manual" }); ok(anon.status === 307 && anon.headers.get("location")!.endsWith("/login"), "anonymous user redirected to login (HTTP)"); }
ok((await j("/api/profile", { method: "PUT", body: JSON.stringify({ targetRoles: ["Customer Support Specialist"], industries: ["Customer Service"], location: "Baltimore, MD", workPreference: "REMOTE", skills: ["CRM", "Scheduling"], accessibility: { reducedMotion: true } }) })).s === 200, "onboarding saved");
ok((await req("/dashboard")).status === 200, "dashboard renders");
ok((await j("/api/profile", { method: "PUT", body: JSON.stringify({ targetRoles: ["x"], gender: "should be ignored" }) })).s === 200, "unknown demographic fields are stripped by validation");

// Upload real PDF and DOCX files (generated), plus a disguised file
const sample = structureText(`Sam Lee\nAtlanta, GA | sam@example.com | (404) 555-0100\n\nEXPERIENCE\nMedical Receptionist | Peach Clinic | Atlanta, GA   Jan 2022 - Present\n• Responsible for scheduling 40 patient appointments daily in Epic\n• Helped with insurance verification and medical billing questions\n\nEDUCATION\nGeorgia State University\nBachelor of Science, Biology 2021\n\nSKILLS\nScheduling, Customer Service`);
const pdf = await exportPdf(sample, "classic"); const docx = await exportDocx(sample, "classic");
const up = async (buf: Buffer, name: string, type: string) => { const fd = new FormData(); fd.append("file", new Blob([new Uint8Array(buf)], { type }), name); return j("/api/resumes", { method: "POST", body: fd }); };
const p = await up(pdf, "sam.pdf", "application/pdf"); ok(p.s === 200, `PDF upload parsed (${p.s})`);
const d = await up(docx, "sam.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"); ok(d.s === 200, "DOCX upload parsed");
ok((await up(Buffer.from("MZ\x90\x00 not a pdf"), "evil.pdf", "application/pdf")).s === 415, "spoofed file type rejected");
const r = await j(`/api/resumes/${d.d.id}`); const data = r.d.resume.data;
ok(data.experience[0]?.title === "Medical Receptionist" && data.experience[0].bullets.length === 2, "DOCX experience extracted");
const rp = await j(`/api/resumes/${p.d.id}`); ok(rp.d.resume.data.contact.email === "sam@example.com", "PDF contact extracted");

const jd = "Medical Receptionist needed. Requirements: 1+ years scheduling experience. Experience with EHR systems like Epic required. HIPAA knowledge. Customer service and data entry. Medical billing a plus.";
const an = await j(`/api/resumes/${d.d.id}/analyze`, { method: "POST", body: JSON.stringify({ jobDescription: jd, content: data }) });
ok(an.s === 200 && an.d.analysis.matched.includes("EHR/EMR") && an.d.analysis.missing.includes("HIPAA"), `analysis: matched ${an.d.analysis?.matched?.length}, missing ${an.d.analysis?.missing?.join(",")}`);
ok(!("score" in an.d.analysis), "no ATS score returned");
const sugs = an.d.suggestions.map((s: { kind: string }, i: number) => ({ ...s, status: i === 0 ? "accepted" : "rejected" }));
const before = data.experience[0].bullets[0];
const accepted = sugs[0]; const content = structuredClone(data);
if (accepted.kind === "bullet") { const [eid, idx] = accepted.target.split(":"); content.experience.find((e: { id: string }) => e.id === eid).bullets[+idx] = accepted.after; }
const v = await j(`/api/resumes/${d.d.id}/versions`, { method: "POST", body: JSON.stringify({ label: "Tailored: Medical Receptionist", templateId: "healthcare", content, jobTitle: "Medical Receptionist", jobDescription: jd, analysis: an.d.analysis, suggestions: sugs }) });
ok(v.s === 200, `version saved (accepted: "${before}" → "${accepted.after}")`);
const ex1 = await req(`/api/versions/${v.d.id}/export?format=docx`); ok(ex1.status === 200 && (await ex1.arrayBuffer()).byteLength > 1000, "DOCX export");
const ex2 = await req(`/api/versions/${v.d.id}/export?format=pdf&template=technology`); ok(ex2.status === 200 && ex2.headers.get("content-type") === "application/pdf", "PDF export");

// Jobs
const live = await j("/api/jobs"); ok(live.s === 200 && live.d.rows.every((x: { isDemo: boolean }) => !x.isDemo), `live jobs exclude demo (total ${live.d.total})`);
const dj = await j("/api/jobs?demo=1&q=customer&workMode=REMOTE"); ok(dj.d.total > 0 && dj.d.rows.every((x: { isDemo: boolean; workMode: string }) => x.isDemo && x.workMode === "REMOTE"), `demo search + filters (${dj.d.total})`);
const job = dj.d.rows[0];
ok((await j(`/api/jobs/${job.id}/save`, { method: "POST" })).d.saved === true, "save job");
ok((await j("/api/jobs?demo=1&saved=1")).d.total === 1, "saved filter");
const m = await j(`/api/jobs/${job.id}/match`); ok(m.s === 200 && Array.isArray(m.d.reasons) && !/\d+%/.test(JSON.stringify(m.d)), `match explanation: ${m.d.reasons?.[0]}`);
const app = await j("/api/applications", { method: "POST", body: JSON.stringify({ jobId: job.id, company: job.company, title: job.title, url: job.applyUrl, status: "APPLIED", notes: "Spoke with recruiter" }) }); ok(app.s === 200, "application tracked");
ok((await j(`/api/applications/${app.d.id}`, { method: "PATCH", body: JSON.stringify({ status: "INTERVIEWING", reminderAt: new Date(Date.now() - 1000).toISOString(), resumeVersionId: v.d.id }) })).s === 200, "application updated");
const n = await j("/api/notifications"); ok(n.d.items.some((x: { title: string }) => x.title.startsWith("Follow up")), "due reminder became a notification");

// Learning, assessments, coach
ok((await j("/api/assessments", { method: "POST", body: JSON.stringify({ kind: "mcq", module: "numerical", answers: { n1: 1, n2: 1, n3: 2 }, durationSec: 40 }) })).d.score === 3, "MCQ graded server-side");
ok((await j("/api/assessments", { method: "POST", body: JSON.stringify({ kind: "typing", module: "typing", passage: 0, typed: "Thank you for contacting", durationSec: 6 }) })).d.accuracy === 100, "typing scored");
ok((await j("/api/lessons/ats-myths-facts", { method: "POST", body: JSON.stringify({ answers: [1, 1, 1] }) })).d.completed === true, "lesson quiz completed");
const iv = await j("/api/interview", { method: "POST", body: JSON.stringify({ question: "Tell me about a difficult customer", answer: "At my last job a customer was upset. I listened and I resolved it. As a result they stayed." }) }); ok(iv.s === 200 && iv.d.star.parts.action, "STAR feedback");
const c = await j("/api/coach", { method: "POST", body: JSON.stringify({ topic: "salary", message: "How much do medical receptionists make?" }) }); ok(c.s === 200 && /bls\.gov/.test(c.d.reply), "coach salary answer cites sources");
ok((await j(`/api/coach?threadId=${c.d.threadId}`)).d.messages.length === 2, "coach history stored & decrypted");
ok((await j("/api/coaches", { method: "POST", body: JSON.stringify({ name: "Test Coach", headline: "Helps career changers", bio: "I help people move into new careers with a practical plan and honest feedback.", specialties: ["Career change"], credentials: [{ name: "Cert", issuer: "Org", verifyUrl: "" }], bookingUrl: "https://example.com/book", remote: true }) })).d.status === "PENDING", "coach listing submitted as PENDING");

// Security
ok((await j("/api/admin/ingest", { method: "POST", body: "{}" })).s === 403, "non-admin blocked from admin API");
ok((await j("/api/resumes", { method: "POST", headers: { origin: "https://evil.example" }, body: JSON.stringify({ text: "x".repeat(40) }) })).s === 403, "cross-origin POST blocked");
ok((await fetch(B + "/api/cron/ingest")).status === 401, "cron requires secret");
const ex = await j("/api/account/export"); ok(ex.s === 200 && ex.d.resumes.length === 2 && ex.d.applications[0].notes === "Spoke with recruiter" && !("passwordHash" in ex.d.account), "data export (decrypted, no password hash)");
const myCookie = cookie;

// Another user can't read my resume
cookie = ""; await j("/api/auth/signup", { method: "POST", body: JSON.stringify({ name: "Other", email: `o${Date.now()}@example.com`, password: "correcthorse9", acceptTerms: true }) });
ok((await j(`/api/resumes/${d.d.id}`)).s === 404, "other users cannot access my resume (IDOR)");
ok((await req(`/api/versions/${v.d.id}/export?format=pdf`)).status === 404, "other users cannot export my version");

// Admin
cookie = ""; ok((await j("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@equalpath.local", password: "AdminPass12345" }) })).s === 200, "admin login");
const ing = await j("/api/admin/ingest", { method: "POST", body: JSON.stringify({ sourceId: "demo" }) }); ok(ing.s === 200 && ing.d.results[0].status === "SUCCESS", "admin-triggered ingestion");
ok((await req("/admin")).status === 200, "admin dashboard renders");

// Deletion
cookie = myCookie;
ok((await j("/api/account", { method: "DELETE", body: JSON.stringify({ password: "wrong" }) })).s === 401, "delete requires password");
ok((await j("/api/account", { method: "DELETE", body: JSON.stringify({ password: "correcthorse9" }) })).s === 200, "account deleted");
ok((await j("/api/resumes")).s === 401, "session gone after deletion");
