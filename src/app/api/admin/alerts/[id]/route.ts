import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler } from "@/lib/api";
export const POST = handler<{ id: string }>(async ({ params }) => {
  await db.update(schema.alerts).set({ resolvedAt: new Date() }).where(eq(schema.alerts.id, params.id));
  return { ok: true };
}, { auth: "admin" });
