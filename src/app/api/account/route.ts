import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { verifyPassword } from "@/lib/auth";
import { deleteObject } from "@/lib/storage";
import { audit } from "@/lib/usage";

/** Permanently deletes the account; cascades to all personal data and removes stored files. */
export const DELETE = handler(async ({ req, user }) => {
  const { password } = await body(req, z.object({ password: z.string().min(1) }));
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
  if (!u || !(await verifyPassword(password, u.passwordHash))) throw new HttpError(401, "Password is incorrect.");
  const files = await db.select({ k: schema.resumes.storageKey }).from(schema.resumes).where(eq(schema.resumes.userId, user.id));
  for (const f of files) if (f.k) await deleteObject(f.k).catch(() => {});
  await db.delete(schema.users).where(eq(schema.users.id, user.id));
  await audit("system", "account.delete", "redacted", {}); // no PII retained
  (await cookies()).delete("ep_session");
  return { ok: true };
});
