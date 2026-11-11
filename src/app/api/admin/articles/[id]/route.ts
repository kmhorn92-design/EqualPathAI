import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler } from "@/lib/api";
import { audit } from "@/lib/usage";
export const PATCH = handler<{ id: string }>(async ({ req, user, params }) => {
  const { status } = await body(req, z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]) }));
  await db.update(schema.articles).set({ status }).where(eq(schema.articles.id, params.id));
  await audit(user.id, "article.moderate", params.id, { status });
  return { ok: true };
}, { auth: "admin" });
