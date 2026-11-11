import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler } from "@/lib/api";
import { ownVersion } from "@/lib/resume/access";
export const DELETE = handler<{ id: string }>(async ({ user, params }) => {
  const v = await ownVersion(user.id, params.id);
  await db.delete(schema.resumeVersions).where(eq(schema.resumeVersions.id, v.id));
  return { ok: true };
});
