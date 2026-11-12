import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { audit } from "@/lib/usage";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("hide"), reason: z.enum(["Spam or scam", "Duplicate", "Expired or filled", "Discriminatory language", "Wrong information", "Other"]), note: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("unhide") }),
]);

/** Hide a listing from the board (it stays hidden even if its source sends it again), or restore it. */
export const PATCH = handler<{ id: string }>(async ({ req, user, params }) => {
  const i = await body(req, input);
  const j = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, params.id), columns: { id: true, title: true, company: true, sourceId: true } });
  if (!j) throw new HttpError(404, "Listing not found");
  if (i.action === "hide") {
    const reason = i.note ? `${i.reason}: ${i.note}` : i.reason;
    await db.update(schema.jobs).set({ hiddenAt: new Date(), hiddenReason: reason, hiddenBy: user.email }).where(eq(schema.jobs.id, j.id));
  } else await db.update(schema.jobs).set({ hiddenAt: null, hiddenReason: null, hiddenBy: null }).where(eq(schema.jobs.id, j.id));
  await audit(`admin:${user.email}`, `job.${i.action}`, j.id, { title: j.title, company: j.company, source: j.sourceId, ...(i.action === "hide" ? { reason: i.reason } : {}) });
  return { ok: true };
}, { auth: "admin" });
