/**
 * Development seed. Everything created here is clearly labeled DEMO and flagged isDemo.
 * Never run against production with ENABLE_DEMO_JOBS — demo jobs are refused when NODE_ENV=production.
 */
import "./env";
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
  // DEMO focus areas, and one DEMO coach account so the in-app booking flow can be tested end to end.
  const focus: Record<string, ("REMOTE" | "HYBRID" | "ONSITE")[]> = { "[DEMO] Jordan Ellis": ["REMOTE"], "[DEMO] Priya Nair": ["REMOTE", "HYBRID"], "[DEMO] Marcus Webb": ["HYBRID", "ONSITE"] };
  for (const [name, f] of Object.entries(focus)) await db.update(schema.coaches).set({ focus: f }).where(eq(schema.coaches.name, name));
  const coachEmail = "coach@equalpath.local";
  let coachUser = await db.query.users.findFirst({ where: eq(schema.users.email, coachEmail) });
  if (!coachUser) {
    const coachPw = process.env.SEED_COACH_PASSWORD ?? randomBytes(9).toString("base64url") + "1a";
    [coachUser] = await db.insert(schema.users).values({ email: coachEmail, name: "Jordan (DEMO coach)", passwordHash: await bcrypt.hash(coachPw, 12), onboardedAt: new Date() }).returning();
    await db.insert(schema.consents).values({ userId: coachUser.id, termsAcceptedAt: new Date() });
    await db.insert(schema.profiles).values({ userId: coachUser.id });
    console.log(`✓ demo coach account: ${coachEmail} / ${coachPw}`);
  }
  const jordan = await db.query.coaches.findFirst({ where: eq(schema.coaches.name, "[DEMO] Jordan Ellis") });
  if (jordan && !jordan.userId) {
    await db.update(schema.coaches).set({ userId: coachUser.id, bookingEnabled: true, timezone: "America/Chicago", formats: ["video", "phone"] }).where(eq(schema.coaches.id, jordan.id));
    await db.insert(schema.coachAvailability).values([1, 2, 3, 4, 5].flatMap((d) => [{ coachId: jordan.id, weekday: d, startMinute: 9 * 60, endMinute: 12 * 60 }, { coachId: jordan.id, weekday: d, startMinute: 13 * 60, endMinute: 17 * 60 }]));
  }
  console.log("✓ demo coaches (Jordan Ellis takes in-app bookings)");

  const articles = [
    { slug: "demo-reading-a-job-posting", title: "How to Read a Job Posting (DEMO article)", category: "Job search", summary: "Separate must-haves from nice-to-haves.", body: "DEMO ARTICLE for development.\n\nJob postings often list more qualifications than any one candidate has. Look for words like 'required' versus 'preferred'. If you meet most required qualifications, consider applying.\n\nUse Resume Studio to compare your resume against the posting and see which keywords you already demonstrate.", sourceUrl: "https://www.careeronestop.org/JobSearch/job-search.aspx" },
    { slug: "demo-employment-gaps", title: "Explaining Employment Gaps Honestly (DEMO article)", category: "Resumes", summary: "Short, truthful framing works better than hiding.", body: "DEMO ARTICLE for development.\n\nGaps happen for caregiving, health, education, relocation, and many other reasons. You don't owe anyone private details. A brief line such as 'Family caregiver, 2021–2023' is honest and sufficient.\n\nFocus the conversation on what you're ready to do next.", sourceUrl: null },
  ];
  for (const a of articles) await db.insert(schema.articles).values({ ...a, status: "APPROVED", isDemo: true }).onConflictDoNothing();
  console.log("✓ demo articles");

  // DEMO hiring partners: fictional companies and recruiters (example.com addresses, reserved 555-01xx numbers).
  const demoPartners = [
    { name: "DEMO Northwind Health", industry: "Healthcare", brandColor: "#0E9F8E", description: "DEMO PARTNER (fictional). A regional health system hiring patient-access, medical-billing and care-technician roles, with paid certification support for career changers.", hiringFor: ["Patient Care Technician", "Medical Billing Specialist", "Patient Access Rep"], locations: ["Baltimore, MD", "Remote (US)"], workModes: ["ONSITE", "HYBRID", "REMOTE"] as const, partnerSince: "2026",
      recruiters: [{ name: "[DEMO] Alicia Moreno", title: "Talent Acquisition Partner, Clinical Support", email: "alicia.moreno@northwind-demo.example.com", phone: "(555) 010-2041", specialties: ["Patient care", "Entry-level"], workModes: ["ONSITE", "HYBRID"] as const },
                   { name: "[DEMO] Ben Carter", title: "Recruiter, Revenue Cycle (Remote)", email: "ben.carter@northwind-demo.example.com", phone: null, specialties: ["Medical billing", "Remote roles"], workModes: ["REMOTE"] as const }] },
    { name: "DEMO Contoso Labs", industry: "Technology", brandColor: "#6D28D9", description: "DEMO PARTNER (fictional). A software company with an apprenticeship pathway into junior developer, data analyst and IT support roles. No degree required for apprentices.", hiringFor: ["Junior Frontend Developer", "Data Analyst", "IT Support"], locations: ["Remote (US)", "Atlanta, GA"], workModes: ["REMOTE", "HYBRID"] as const, partnerSince: "2026",
      recruiters: [{ name: "[DEMO] Priya Shah", title: "Early Careers Recruiter", email: "priya.shah@contoso-demo.example.com", phone: "(555) 010-3318", specialties: ["Apprenticeships", "Junior developers"], workModes: ["REMOTE", "HYBRID"] as const }] },
    { name: "DEMO Fabrikam Staffing", industry: "Staffing Agency", brandColor: "#D97706", description: "DEMO PARTNER (fictional). A staffing agency placing candidates in customer service, administrative and warehouse roles, with temp-to-hire options.", hiringFor: ["Customer Support Specialist", "Administrative Assistant", "Warehouse Associate"], locations: ["Chicago, IL", "Houston, TX", "Remote (US)"], workModes: ["ONSITE", "REMOTE"] as const, partnerSince: "2026",
      recruiters: [{ name: "[DEMO] Marcus Lee", title: "Staffing Manager, Customer Service", email: "marcus.lee@fabrikam-demo.example.com", phone: "(555) 010-4472", specialties: ["Call center", "Bilingual roles"], workModes: ["REMOTE", "ONSITE"] as const },
                   { name: "[DEMO] Dana Brooks", title: "Recruiter, Logistics & Light Industrial", email: "dana.brooks@fabrikam-demo.example.com", phone: "(555) 010-4486", specialties: ["Warehouse", "Forklift"], workModes: ["ONSITE"] as const }] },
  ];
  const admin = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  for (const dp of demoPartners) {
    if (await db.query.partners.findFirst({ where: eq(schema.partners.name, dp.name) })) continue;
    const { recruiters, workModes, ...rest } = dp;
    const [p] = await db.insert(schema.partners).values({ ...rest, workModes: [...workModes], slug: dp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), jobCompanyNames: [dp.name],
      status: "APPROVED", agreementConfirmedAt: new Date(), agreementConfirmedBy: admin!.id, isDemo: true }).returning();
    await db.insert(schema.recruiters).values(recruiters.map((r) => ({ ...r, workModes: [...r.workModes], partnerId: p.id, consentConfirmedAt: new Date(), consentConfirmedBy: admin!.id, isDemo: true })));
  }
  console.log("✓ demo hiring partners & recruiters");

  await syncSources();
  if (process.env.ENABLE_DEMO_JOBS === "true" && process.env.NODE_ENV !== "production") {
    const r = await runSource(demo, "seed");
    console.log(`✓ demo jobs: ${r.inserted} inserted, ${r.updated} updated (flagged isDemo; hidden unless "DEMO data" is toggled)`);
  } else console.log("• demo jobs skipped (set ENABLE_DEMO_JOBS=true for development)");
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
