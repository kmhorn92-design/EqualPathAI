import { and, count, eq, gte, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { body, handler } from "@/lib/api";
import { randomToken, sha256 } from "@/lib/crypto";
import { appUrl, resetEmail, sendMail } from "@/lib/mail";
import { forgotSchema } from "@/lib/validation";
import { audit, track } from "@/lib/usage";

const TTL_MIN = 60;
const PER_EMAIL_PER_HOUR = 3;

/**
 * Starts a password reset. Always answers the same way whether or not the email has an account,
 * so the form can't be used to find out who is registered.
 */
export const POST = handler(async ({ req }) => {
  const { email } = await body(req, forgotSchema);
  const generic = { ok: true, message: "If an account uses that email, we've sent a link to reset the password. Check your inbox and spam folder." };
  const u = await db.query.users.findFirst({ where: eq(schema.users.email, email), columns: { id: true, name: true, email: true, suspendedAt: true } });
  if (!u || u.suspendedAt) return generic;

  const hourAgo = new Date(Date.now() - 36e5);
  const [{ n }] = await db.select({ n: count() }).from(schema.passwordResets).where(and(eq(schema.passwordResets.userId, u.id), gte(schema.passwordResets.createdAt, hourAgo)));
  if (n >= PER_EMAIL_PER_HOUR) return generic; // quietly cap emails per account

  // A new link replaces any older unused ones.
  await db.update(schema.passwordResets).set({ usedAt: new Date() }).where(and(eq(schema.passwordResets.userId, u.id), isNull(schema.passwordResets.usedAt)));
  const token = randomToken(32);
  await db.insert(schema.passwordResets).values({ userId: u.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL_MIN * 6e4) });
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const result = await sendMail({ ...resetEmail(u.name, link, TTL_MIN), to: u.email }).catch((e) => { console.error("[mail] reset email failed", e); return "failed" as const; });
  if (result === "not-configured" || result === "failed") {
    const msg = result === "failed" ? "A password reset email failed to send. Check the SMTP settings." : "Password reset requested, but email isn't set up (SMTP_HOST / SMTP_USER / SMTP_PASS).";
    const open = await db.query.alerts.findFirst({ where: and(eq(schema.alerts.kind, "EMAIL_NOT_SENT"), isNull(schema.alerts.resolvedAt)) });
    if (!open) await db.insert(schema.alerts).values({ level: "warning", kind: "EMAIL_NOT_SENT", message: msg });
  }
  await audit(u.id, "auth.reset_requested", u.id, { delivery: result });
  await track("password_reset_requested");
  return generic;
}, { auth: "none", limit: { key: "forgot", max: 5, windowMs: 15 * 60_000 } });
