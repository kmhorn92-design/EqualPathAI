/**
 * Development seed. Everything created here is clearly labeled DEMO and flagged isDemo.
 * Never run against production with ENABLE_DEMO_JOBS — demo jobs are refused when NODE_ENV=production.
 */
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db, schema, pool } from "../src/db";
import { syncSources, runSource } from "../src/lib/jobs/ingest";
import { demo } from "../src/lib/jobs/adapters/demo";

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@equalpath.local").toLowerCase();
  const pw = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(9).toString("base64url") + "1a";
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!existing) {
    const [u] = await db.insert(schema.users).values({ email, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(pw, 12), onboardedAt: new Date() }).returning();
    await db.insert(schema.consents).values({ userId: u.id, termsAcceptedAt: new Date() });
    await db.insert(schema.profiles).values({ userId: u.id });
    console.log(`✓ admin created: ${email} / ${pw}  (change this password)`);
  } else console.log(`• admin exists: ${email}`);

  const coaches = [
    { name: "[DEMO] Jordan Ellis", headline: "DEMO coach: career changers into healthcare admin", specialties: ["Career change", "Healthcare careers", "Resume review"], priceFrom: 0, priceNote: "DEMO: sliding scale", languages: ["English", "Spanish"] },
    { name: "[DEMO] Priya Nair", headline: "DEMO coach: first tech job & interview prep", specialties: ["Tech careers", "Interview prep", "Students & new grads"], priceFrom: 60, priceNote: "DEMO per session", languages: ["English"] },
    { name: "[DEMO] Marcus Webb", headline: "DEMO coach: returning to work & federal applications", specialties: ["Returning to work", "Federal jobs", "Salary negotiation"], priceFrom: 90, priceNote: "DEMO per session", languages: ["English"] },
  ];
  for (const c of coaches) {
    const exists = await db.query.coaches.findFirst({ where: eq(schema.coaches.name, c.name) });
    if (!exists) await db.insert(schema.coaches).values({ ...c, bio: "This is a DEMO profile for development and testing. It does not represent a real person, credentials, or services.", credentials: [{ name: "Example Coaching Certificate (DEMO)", issuer: "Example Institute", verified: false }], bookingUrl: "https://example.com/demo-booking", remote: true, status: "APPROVED", isDemo: true });
  }
  console.log("✓ demo coaches");

  const articles = [
    { slug: "demo-reading-a-job-posting", title: "How to Read a Job Posting (DEMO article)", category: "Job search", summary: "Separate must-haves from nice-to-haves.", body: "DEMO ARTICLE for development.\n\nJob postings often list more qualifications than any one candidate has. Look for words like 'required' versus 'preferred'. If you meet most required qualifications, consider applying.\n\nUse Resume Studio to compare your resume against the posting and see which keywords you already demonstrate.", sourceUrl: "https://www.careeronestop.org/JobSearch/job-search.aspx" },
    { slug: "demo-employment-gaps", title: "Explaining Employment Gaps Honestly (DEMO article)", category: "Resumes", summary: "Short, truthful framing works better than hiding.", body: "DEMO ARTICLE for development.\n\nGaps happen for caregiving, health, education, relocation, and many other reasons. You don't owe anyone private details. A brief line such as 'Family caregiver, 2021–2023' is honest and sufficient.\n\nFocus the conversation on what you're ready to do next.", sourceUrl: null },
  ];
  for (const a of articles) await db.insert(schema.articles).values({ ...a, status: "APPROVED", isDemo: true }).onConflictDoNothing();
  console.log("✓ demo articles");

  await syncSources();
  if (process.env.ENABLE_DEMO_JOBS === "true" && process.env.NODE_ENV !== "production") {
    const r = await runSource(demo, "seed");
    console.log(`✓ demo jobs: ${r.inserted} inserted, ${r.updated} updated (flagged isDemo; hidden unless "DEMO data" is toggled)`);
  } else console.log("• demo jobs skipped (set ENABLE_DEMO_JOBS=true for development)");
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
