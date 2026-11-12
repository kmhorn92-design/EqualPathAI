import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler } from "@/lib/api";
import { audit } from "@/lib/usage";

export const PATCH = handler<{ id: string }>(async ({ req, user, params }) => {
  const { active } = await body(req, z.object({ active: z.boolean() }));
  await db.update(schema.recruiters).set({ active }).where(eq(schema.recruiters.id, params.id));
  await audit(user.id, "recruiter.update", params.id, { active });
  return { ok: true };
}, { auth: "admin" });

/** Removal on request: contact details are deleted, not just hidden. */
export const DELETE = handler<{ id: string }>(async ({ user, params }) => {
  await db.delete(schema.recruiters).where(eq(schema.recruiters.id, params.id));
  await audit(user.id, "recruiter.delete", params.id);
  return { ok: true };
}, { auth: "admin" });
