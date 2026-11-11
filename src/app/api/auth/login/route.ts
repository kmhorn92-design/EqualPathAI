import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

const DUMMY = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8Q3jqbM2nE6y0Vt5n2YB2kM8f1lQ7e";

export const POST = handler(async ({ req }) => {
  const { email, password } = await body(req, loginSchema);
  const u = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  const ok = await verifyPassword(password, u?.passwordHash ?? DUMMY); // constant-ish time regardless of existence
  if (!u || !ok) throw new HttpError(401, "Email or password is incorrect.");
  await createSession(u.id);
  await db.update(schema.users).set({ lastActiveAt: new Date() }).where(eq(schema.users.id, u.id));
  return { ok: true, next: u.onboardedAt ? "/dashboard" : "/onboarding" };
}, { auth: "none", limit: { key: "login", max: 10, windowMs: 15 * 60_000 } });
