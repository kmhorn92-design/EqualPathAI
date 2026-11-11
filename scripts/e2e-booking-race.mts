import { eq } from "drizzle-orm";
import { db, schema, pool } from "../src/db";
const B = "http://localhost:3100";
const c = await db.query.coaches.findFirst({ where: eq(schema.coaches.name, "[DEMO] Jordan Ellis") });
async function user(n: number) {
  const r = await fetch(B + "/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "R" + n, email: `race${n}${Date.now()}@example.com`, password: "correcthorse9", acceptTerms: true }) });
  return r.headers.get("set-cookie")!.split(";")[0];
}
const cookies = await Promise.all(Array.from({ length: 8 }, (_, i) => user(i)));
const slots = (await (await fetch(`${B}/api/coaches/${c!.id}/slots?session=interview`, { headers: { cookie: cookies[0] } })).json()).slots;
const target = slots[10];
const results = await Promise.all(cookies.map((ck) => fetch(B + "/api/bookings", { method: "POST", headers: { "content-type": "application/json", cookie: ck }, body: JSON.stringify({ coachId: c!.id, sessionType: "interview", format: "video", startsAt: target }) }).then((r) => r.status)));
console.log("8 simultaneous requests for one slot →", results.join(", "));
console.log(results.filter((s) => s === 200).length === 1 ? "✓ exactly one booking succeeded" : "✗ race condition!");
await pool.end();
