import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { body, handler } from "@/lib/api";
import { profileSchema } from "@/lib/validation";
import { track } from "@/lib/usage";

export const GET = handler(async ({ user }) => {
  return { profile: (await db.query.profiles.findFirst({ where: eq(schema.profiles.userId, user.id) })) ?? null };
});

export const PUT = handler(async ({ req, user }) => {
  const p = await body(req, profileSchema);
  const vals = { ...p, location: p.location || null, experienceLevel: p.experienceLevel || null, education: p.education || null };
  await db.insert(schema.profiles).values({ userId: user.id, ...vals }).onConflictDoUpdate({ target: schema.profiles.userId, set: vals });
  if (!user.onboardedAt) {
    await db.update(schema.users).set({ onboardedAt: new Date() }).where(eq(schema.users.id, user.id));
    await db.insert(schema.notifications).values({ userId: user.id, title: "Welcome to EqualPath AI", body: "Start by uploading your resume in Resume Studio.", href: "/resume" });
    await track("onboarding_complete");
  }
  return { ok: true };
});
