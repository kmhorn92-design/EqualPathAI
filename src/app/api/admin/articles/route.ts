import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler } from "@/lib/api";
import { audit } from "@/lib/usage";
export const POST = handler(async ({ req, user }) => {
  const a = await body(req, z.object({ title: z.string().trim().min(5).max(200), summary: z.string().trim().min(10).max(400), body: z.string().trim().min(50).max(20000), category: z.string().trim().min(2).max(60), sourceUrl: z.string().url().optional().or(z.literal("")) }));
  const slug = `${a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${Date.now().toString(36)}`;
  const [row] = await db.insert(schema.articles).values({ ...a, sourceUrl: a.sourceUrl || null, slug, status: "PENDING" }).returning({ id: schema.articles.id });
  await audit(user.id, "article.create", row.id);
  return { id: row.id };
}, { auth: "admin" });
