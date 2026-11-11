import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { audit } from "@/lib/usage";

export const PATCH = handler<{ id: string }>(async ({ req, user, params }) => {
  const i = await body(req, z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(), verifyCredential: z.number().int().min(0).max(20).optional(), verified: z.boolean().optional() }));
  const c = await db.query.coaches.findFirst({ where: eq(schema.coaches.id, params.id) });
  if (!c) throw new HttpError(404, "Coach not found");
  const set: Partial<typeof schema.coaches.$inferInsert> = {};
  if (i.status) set.status = i.status;
  if (i.verifyCredential !== undefined) {
    const creds = [...c.credentials]; if (!creds[i.verifyCredential]) throw new HttpError(400, "No such credential");
    creds[i.verifyCredential] = { ...creds[i.verifyCredential], verified: i.verified ?? true, verifiedAt: new Date().toISOString() };
    set.credentials = creds;
  }
  await db.update(schema.coaches).set(set).where(eq(schema.coaches.id, c.id));
  await audit(user.id, "coach.moderate", c.id, i);
  return { ok: true };
}, { auth: "admin" });
