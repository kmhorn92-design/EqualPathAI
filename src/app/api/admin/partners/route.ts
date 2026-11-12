import { db, schema } from "@/db";
import { body, handler } from "@/lib/api";
import { slugify } from "@/lib/partners";
import { partnerInput } from "@/lib/partners-validation";
import { audit } from "@/lib/usage";

export const POST = handler(async ({ req, user }) => {
  const i = await body(req, partnerInput);
  const { agreementConfirmed, ...rest } = i;
  const [p] = await db.insert(schema.partners).values({
    ...rest, website: rest.website || null, slug: `${slugify(i.name)}-${Date.now().toString(36).slice(-4)}`,
    jobCompanyNames: rest.jobCompanyNames.length ? rest.jobCompanyNames : [i.name],
    agreementConfirmedAt: agreementConfirmed ? new Date() : null, agreementConfirmedBy: agreementConfirmed ? user.id : null,
    status: agreementConfirmed ? "APPROVED" : "PENDING",
  }).returning({ id: schema.partners.id, slug: schema.partners.slug, status: schema.partners.status });
  await audit(user.id, "partner.create", p.id, { agreementConfirmed });
  return p;
}, { auth: "admin" });
