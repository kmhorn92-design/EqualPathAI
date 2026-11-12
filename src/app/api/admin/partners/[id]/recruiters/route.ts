import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { audit } from "@/lib/usage";
import { recruiterInput } from "@/lib/partners-validation";

export const POST = handler<{ id: string }>(async ({ req, user, params }) => {
  const p = await db.query.partners.findFirst({ where: eq(schema.partners.id, params.id) });
  if (!p) throw new HttpError(404, "Partner not found");
  const i = await body(req, recruiterInput);
  const [r] = await db.insert(schema.recruiters).values({
    partnerId: p.id, name: i.name, title: i.title, email: i.email, phone: i.phone || null, specialties: i.specialties, workModes: i.workModes,
    linkedinUrl: i.linkedinUrl || null, consentConfirmedAt: new Date(), consentConfirmedBy: user.id, isDemo: p.isDemo,
  }).returning({ id: schema.recruiters.id });
  await audit(user.id, "recruiter.create", r.id, { partnerId: p.id });
  return r;
}, { auth: "admin" });
