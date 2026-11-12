import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { isOwnerEmail, ownerConfigured } from "@/lib/auth";
import { audit } from "@/lib/usage";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("promote") }),
  z.object({ action: z.literal("demote") }),
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(3, "Add a short reason").max(300) }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("signout") }),
]);

/** Account administration. Admins see and change account status only — never resume, chat or application content. */
export const PATCH = handler<{ id: string }>(async ({ req, user, params }) => {
  const i = await body(req, input);
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, params.id), columns: { id: true, email: true, role: true, suspendedAt: true } });
  if (!u) throw new HttpError(404, "User not found");
  if (u.id === user.id && i.action !== "signout") throw new HttpError(400, "You can't change your own role or status. Ask another admin.");
  const actorIsOwner = isOwnerEmail(user.email);
  // The owner's account is untouchable by anyone else.
  if (isOwnerEmail(u.email) && u.id !== user.id) throw new HttpError(403, "This is the owner account. Other admins can't change, suspend or sign it out.");
  if (ownerConfigured() && !actorIsOwner) {
    if (i.action === "promote" || i.action === "demote") throw new HttpError(403, "Only the owner can give or remove admin access.");
    if (u.role === "ADMIN") throw new HttpError(403, "Only the owner can change another admin's account.");
  }
  const activeAdmins = async () => (await db.select({ n: count() }).from(schema.users).where(and(eq(schema.users.role, "ADMIN"), isNull(schema.users.suspendedAt))))[0].n;

  if (i.action === "promote") await db.update(schema.users).set({ role: "ADMIN" }).where(eq(schema.users.id, u.id));
  if (i.action === "demote") {
    if (u.role === "ADMIN" && !u.suspendedAt && (await activeAdmins()) <= 1) throw new HttpError(400, "There must always be at least one active admin.");
    await db.update(schema.users).set({ role: "USER" }).where(eq(schema.users.id, u.id));
  }
  if (i.action === "suspend") {
    if (u.role === "ADMIN" && !u.suspendedAt && (await activeAdmins()) <= 1) throw new HttpError(400, "There must always be at least one active admin.");
    await db.update(schema.users).set({ suspendedAt: new Date(), suspendedReason: i.reason }).where(eq(schema.users.id, u.id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, u.id));
  }
  if (i.action === "restore") await db.update(schema.users).set({ suspendedAt: null, suspendedReason: null }).where(eq(schema.users.id, u.id));
  if (i.action === "signout") await db.delete(schema.sessions).where(eq(schema.sessions.userId, u.id));

  await audit(`admin:${user.email}`, `user.${i.action}`, u.id, { email: u.email, ...("reason" in i ? { reason: i.reason } : {}) });
  return { ok: true };
}, { auth: "admin", limit: { key: "admin-users", max: 120, windowMs: 60 * 60_000 } });
