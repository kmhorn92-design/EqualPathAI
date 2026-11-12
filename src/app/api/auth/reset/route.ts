import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { sha256 } from "@/lib/crypto";
import { resetSchema } from "@/lib/validation";
import { audit, track } from "@/lib/usage";

/** Finishes a reset: one-time link, then every other session is signed out and the user is signed in fresh. */
export const POST = handler(async ({ req }) => {
  const { token, password } = await body(req, resetSchema);
  const r = await db.query.passwordResets.findFirst({ where: and(eq(schema.passwordResets.tokenHash, sha256(token)), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date())) });
  if (!r) throw new HttpError(400, "This reset link has expired or was already used. Request a new one.");
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, r.userId), columns: { id: true, suspendedAt: true, onboardedAt: true } });
  if (!u || u.suspendedAt) throw new HttpError(400, "This reset link has expired or was already used. Request a new one.");

  // Claim the token atomically so it can't be used twice in a race.
  const claimed = await db.update(schema.passwordResets).set({ usedAt: new Date() }).where(and(eq(schema.passwordResets.id, r.id), isNull(schema.passwordResets.usedAt))).returning({ id: schema.passwordResets.id });
  if (!claimed.length) throw new HttpError(400, "This reset link has expired or was already used. Request a new one.");

  await db.update(schema.users).set({ passwordHash: await hashPassword(password) }).where(eq(schema.users.id, u.id));
  await db.update(schema.passwordResets).set({ usedAt: new Date() }).where(and(eq(schema.passwordResets.userId, u.id), isNull(schema.passwordResets.usedAt)));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, u.id)); // sign out everywhere else
  await createSession(u.id);
  await audit(u.id, "auth.password_reset", u.id);
  await track("password_reset_completed");
  return { ok: true, next: u.onboardedAt ? "/dashboard" : "/onboarding" };
}, { auth: "none", limit: { key: "reset", max: 10, windowMs: 15 * 60_000 } });
