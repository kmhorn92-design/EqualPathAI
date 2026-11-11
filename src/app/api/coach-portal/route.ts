import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { FORMATS, isValidTimeZone, normalizeWindows } from "@/lib/booking";
import { requireCoach, windowsFor } from "@/lib/bookings-server";

export const GET = handler(async ({ user }) => {
  const c = await requireCoach(user.id);
  return { coach: { id: c.id, name: c.name, status: c.status, focus: c.focus, formats: c.formats, timezone: c.timezone, bookingEnabled: c.bookingEnabled }, windows: await windowsFor(c.id) };
});

export const PUT = handler(async ({ req, user }) => {
  const c = await requireCoach(user.id);
  const i = await body(req, z.object({
    focus: z.array(z.enum(["REMOTE", "HYBRID", "ONSITE"])).max(3),
    formats: z.array(z.enum(FORMATS)).min(1, "Offer at least one format").max(3),
    timezone: z.string().max(64).refine(isValidTimeZone, "Unknown time zone"),
    bookingEnabled: z.boolean(),
    windows: z.array(z.object({ weekday: z.number().int().min(0).max(6), startMinute: z.number().int().min(0).max(1440), endMinute: z.number().int().min(0).max(1440) })).max(50),
  }));
  const windows = normalizeWindows(i.windows);
  if (i.bookingEnabled && !windows.length) throw new HttpError(400, "Add at least one availability window before turning on booking.");
  await db.transaction(async (tx) => {
    await tx.update(schema.coaches).set({ focus: i.focus, formats: i.formats, timezone: i.timezone, bookingEnabled: i.bookingEnabled }).where(eq(schema.coaches.id, c.id));
    await tx.delete(schema.coachAvailability).where(eq(schema.coachAvailability.coachId, c.id));
    if (windows.length) await tx.insert(schema.coachAvailability).values(windows.map((w) => ({ ...w, coachId: c.id })));
  });
  return { ok: true, windows };
});
