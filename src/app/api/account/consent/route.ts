import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { body, handler } from "@/lib/api";
import { consentSchema } from "@/lib/validation";
import { audit } from "@/lib/usage";

export const PUT = handler(async ({ req, user }) => {
  const c = await body(req, consentSchema);
  await db.update(schema.consents).set(c).where(eq(schema.consents.userId, user.id));
  await audit(user.id, "consent.update", user.id, c);
  return { ok: true };
});
