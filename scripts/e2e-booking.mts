// End-to-end test of in-app coach booking against a running dev server (after `npm run db:seed`).
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
    const t = await r.text(); let d: any; try { d = JSON.parse(t); } catch { d = t; } return { s: r.status, d, h: r.headers };
  };
  return { j, signup: async (name: string) => { await j("/api/auth/signup", { method: "POST", body: JSON.stringify({ name, email: `${name.toLowerCase()}${Date.now()}@example.com`, password: "correcthorse9", acceptTerms: true }) }); await j("/api/profile", { method: "PUT", body: JSON.stringify({ targetRoles: ["Support"] }) }); } };
}
const coachRow = await db.query.coaches.findFirst({ where: eq(schema.coaches.name, "[DEMO] Jordan Ellis") });
const coachId = coachRow!.id;

const alice = client(); await alice.signup("Alice");
const res = await alice.j("/api/resumes", { method: "POST", body: JSON.stringify({ text: "Alice Demo\nalice@example.com\n\nEXPERIENCE\nCashier | Shop | Austin, TX   Jan 2022 - Present\n• Handled cash and customer questions\n\nSKILLS\nCustomer Service", title: "Alice resume" }) });
const versionId = (await alice.j(`/api/resumes/${res.d.id}`)).d.versions[0].id;

const slots = await alice.j(`/api/coaches/${coachId}/slots?session=intro`);
ok(slots.s === 200 && slots.d.slots.length > 10, `slots offered (${slots.d.slots?.length}) in coach zone ${slots.d.coachTimezone}`);
ok(slots.d.slots.every((s: string) => new Date(s).getTime() > Date.now() + 11.9 * 36e5), "all slots respect 12h lead time");
const s0 = slots.d.slots[0];

const bk = await alice.j("/api/bookings", { method: "POST", body: JSON.stringify({ coachId, sessionType: "intro", format: "video", startsAt: s0, arrangement: "REMOTE", goal: "Move from retail into remote support", accessibility: "Captions please", sharedResumeVersionId: versionId, clientTimezone: "America/Los_Angeles" }) });
ok(bk.s === 200 && bk.d.status === "REQUESTED", "client requested a session");

const bob = client(); await bob.signup("Bob");
ok((await bob.j("/api/bookings", { method: "POST", body: JSON.stringify({ coachId, sessionType: "intro", format: "video", startsAt: s0 }) })).s === 409, "same slot can't be double-booked");
ok((await bob.j("/api/bookings", { method: "POST", body: JSON.stringify({ coachId, sessionType: "strategy", format: "video", startsAt: new Date(new Date(s0).getTime() - 30 * 6e4).toISOString() }) })).s === 409, "overlapping longer session rejected");
ok((await bob.j("/api/bookings", { method: "POST", body: JSON.stringify({ coachId, sessionType: "intro", format: "video", startsAt: new Date(new Date(s0).getTime() + 7 * 6e4).toISOString() }) })).s === 409, "off-grid start time rejected");
ok((await bob.j("/api/bookings", { method: "POST", body: JSON.stringify({ coachId, sessionType: "intro", format: "in-person", startsAt: slots.d.slots[3] }) })).s === 400, "unsupported format rejected");
ok((await bob.j("/api/bookings", { method: "POST", body: JSON.stringify({ coachId, sessionType: "intro", format: "video", startsAt: slots.d.slots[3], sharedResumeVersionId: versionId }) })).s === 404, "can't share someone else's resume");
ok(!(await bob.j(`/api/coaches/${coachId}/slots?session=intro`)).d.slots.includes(s0), "booked slot disappears for others");
ok((await alice.j(`/api/bookings/${bk.d.id}`, { method: "PATCH", body: JSON.stringify({ action: "confirm", meetingUrl: "https://meet.example/x" }) })).s === 403, "client can't confirm their own request");
ok((await bob.j(`/api/bookings/${bk.d.id}/resume`)).s === 404, "other users can't open the shared resume");

const coach = client();
ok((await coach.j("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "coach@equalpath.local", password: "CoachPass12345" }) })).s === 200, "coach signs in");
const list = await coach.j("/api/bookings");
const req = list.d.asCoach.find((x: any) => x.id === bk.d.id);
ok(!!req && req.goal === "Move from retail into remote support" && req.accessibility === "Captions please" && req.arrangement === "REMOTE", "coach sees request with decrypted goal & accessibility");
ok(!JSON.stringify(list.d.asCoach).includes("@example.com"), "client email never sent to coach");
const rv = await coach.j(`/api/bookings/${bk.d.id}/resume`); ok(rv.s === 200 && rv.d.content.contact.name === "Alice Demo", "coach opens the shared resume version");
ok((await coach.j(`/api/bookings/${bk.d.id}`, { method: "PATCH", body: JSON.stringify({ action: "confirm" }) })).s === 400, "video confirm requires a meeting link");
ok((await coach.j(`/api/bookings/${bk.d.id}`, { method: "PATCH", body: JSON.stringify({ action: "confirm", meetingUrl: "http://insecure.example" }) })).s === 400, "meeting link must be https");
ok((await coach.j(`/api/bookings/${bk.d.id}`, { method: "PATCH", body: JSON.stringify({ action: "confirm", meetingUrl: "https://meet.example/alice", note: "Looking forward to it!" }) })).s === 200, "coach confirms with meeting link");
const notes = await alice.j("/api/notifications"); ok(notes.d.items.some((n: any) => n.title.startsWith("Session confirmed")), "client notified of confirmation");
const mine = (await alice.j("/api/bookings")).d.asClient[0]; ok(mine.status === "CONFIRMED" && mine.meetingUrl === "https://meet.example/alice" && mine.coachNote === "Looking forward to it!", "client sees link and coach note");
const ics = await alice.j(`/api/bookings/${bk.d.id}/ics`); ok(ics.s === 200 && String(ics.h.get("content-type")).startsWith("text/calendar") && String(ics.d).includes("BEGIN:VEVENT"), "calendar file downloads");
ok((await coach.j(`/api/bookings/${bk.d.id}`, { method: "PATCH", body: JSON.stringify({ action: "complete" }) })).s === 409, "can't complete a session before it starts");

const portal = await coach.j("/api/coach-portal"); ok(portal.s === 200 && portal.d.windows.length === 10, "coach portal loads availability");
ok((await coach.j("/api/coach-portal", { method: "PUT", body: JSON.stringify({ ...portal.d.coach, focus: ["REMOTE", "HYBRID"], windows: [] }) })).s === 400, "can't enable booking with no availability");
ok((await coach.j("/api/coach-portal", { method: "PUT", body: JSON.stringify({ ...portal.d.coach, focus: ["REMOTE", "HYBRID"], timezone: "Mars/Base", windows: portal.d.windows }) })).s === 400, "invalid time zone rejected");
ok((await coach.j("/api/coach-portal", { method: "PUT", body: JSON.stringify({ ...portal.d.coach, focus: ["REMOTE", "HYBRID"], windows: portal.d.windows }) })).s === 200, "coach updates focus & availability");
ok((await bob.j("/api/coach-portal")).s === 403, "non-coach blocked from coach portal API");

ok((await alice.j(`/api/bookings/${bk.d.id}`, { method: "PATCH", body: JSON.stringify({ action: "cancel" }) })).s === 200, "client cancels (more than 2h ahead)");
ok((await coach.j(`/api/bookings/${bk.d.id}/resume`)).s === 404, "shared resume no longer accessible after cancellation");
ok((await bob.j(`/api/coaches/${coachId}/slots?session=intro`)).d.slots.includes(s0), "cancelled slot is open again");
const b2 = await bob.j("/api/bookings", { method: "POST", body: JSON.stringify({ coachId, sessionType: "strategy", format: "phone", startsAt: s0, arrangement: "HYBRID" }) }); ok(b2.s === 200, "another client books the freed time");
ok((await coach.j(`/api/bookings/${b2.d.id}`, { method: "PATCH", body: JSON.stringify({ action: "decline", note: "Can we do Thursday instead?" }) })).s === 200, "coach declines with a note");
ok((await bob.j("/api/notifications")).d.items.some((n: any) => n.body.includes("Thursday")), "client gets decline note");
ok((await coach.j("/api/bookings", { method: "POST", body: JSON.stringify({ coachId, sessionType: "intro", format: "video", startsAt: slots.d.slots[5] }) })).s === 400, "coach can't book themselves");

for (const [c, p] of [[alice, "/sessions"], [coach, "/coach-portal"], [alice, "/coaches?focus=REMOTE"]] as const) ok((await c.j(p)).s === 200, `page renders: ${p}`);
const exp = await alice.j("/api/account/export"); ok(exp.d.coachingSessions?.[0]?.goal === "Move from retail into remote support", "sessions included in personal data export");
await pool.end();
