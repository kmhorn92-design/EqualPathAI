import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { createSession, hashPassword, isListedAdmin } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";
import { track } from "@/lib/usage";

export const POST = handler(async ({ req }) => {
  const input = await body(req, signupSchema);
  const exists = await db.query.users.findFirst({ where: eq(schema.users.email, input.email), columns: { id: true } });
  if (exists) throw new HttpError(409, "An account with that email already exists. Try signing in.");
  const [u] = await db.insert(schema.users).values({ email: input.email, name: input.name, passwordHash: await hashPassword(input.password), role: isListedAdmin(input.email) ? "ADMIN" : "USER" }).returning({ id: schema.users.id });
  await db.insert(schema.consents).values({ userId: u.id, termsAcceptedAt: new Date(), trainingUse: false });
  await createSession(u.id);
  await track("signup");
  return { ok: true, next: "/onboarding" };
}, { auth: "none", limit: { key: "signup", max: 8, windowMs: 60 * 60_000 } });
