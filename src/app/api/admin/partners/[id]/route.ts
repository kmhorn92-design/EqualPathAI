import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { audit } from "@/lib/usage";

export const PATCH = handler<{ id: string }>(async ({ req, user, params }) => {
  const i = await body(req, z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(), agreementConfirmed: z.boolean().optional() }));
  const p = await db.query.partners.findFirst({ where: eq(schema.partners.id, params.id) });
  if (!p) throw new HttpError(404, "Partner not found");
  const set: Partial<typeof schema.partners.$inferInsert> = {};
  if (i.agreementConfirmed !== undefined) { set.agreementConfirmedAt = i.agreementConfirmed ? new Date() : null; set.agreementConfirmedBy = i.agreementConfirmed ? user.id : null; }
  if (i.status) {
    if (i.status === "APPROVED" && !(i.agreementConfirmed ?? p.agreementConfirmedAt)) throw new HttpError(400, "Confirm a partnership agreement is on file before publishing this partner.");
    set.status = i.status;
  }
  await db.update(schema.partners).set(set).where(eq(schema.partners.id, p.id));
  await audit(user.id, "partner.update", p.id, i);
  return { ok: true };
}, { auth: "admin" });

export const DELETE = handler<{ id: string }>(async ({ user, params }) => {
  await db.delete(schema.partners).where(eq(schema.partners.id, params.id));
  await audit(user.id, "partner.delete", params.id);
  return { ok: true };
}, { auth: "admin" });
