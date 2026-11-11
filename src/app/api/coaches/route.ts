import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler } from "@/lib/api";
import { audit } from "@/lib/usage";

/** Coach listing submissions. Always PENDING until an admin approves; credentials unverified until checked. */
export const POST = handler(async ({ req, user }) => {
  const c = await body(req, z.object({
    name: z.string().trim().min(2).max(120), headline: z.string().trim().min(5).max(160), bio: z.string().trim().min(40).max(2000),
    specialties: z.array(z.string().trim().min(1).max(60)).min(1).max(8), credentials: z.array(z.object({ name: z.string().max(120), issuer: z.string().max(120), verifyUrl: z.string().url().max(500).optional().or(z.literal("")) })).max(8),
    priceFrom: z.number().int().min(0).max(10000).optional().nullable(), priceNote: z.string().max(200).optional(), bookingUrl: z.string().url().max(500).refine((u) => u.startsWith("https://"), "Must be https"),
    remote: z.boolean(), location: z.string().max(120).optional(), languages: z.array(z.string().max(40)).max(8).default([]),
  }));
  const [row] = await db.insert(schema.coaches).values({ ...c, credentials: c.credentials.map((x) => ({ ...x, verifyUrl: x.verifyUrl || undefined, verified: false })), status: "PENDING" }).returning({ id: schema.coaches.id });
  await audit(user.id, "coach.submit", row.id);
  return { id: row.id, status: "PENDING" };
});
