import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler, HttpError } from "@/lib/api";
import { generateSlots, SESSION_TYPES, type SessionType } from "@/lib/booking";
import { bookable, busyFor, windowsFor } from "@/lib/bookings-server";

/** Open start times for a session type over the booking horizon (UTC ISO strings). */
export const GET = handler<{ id: string }>(async ({ req, params }) => {
  const c = await db.query.coaches.findFirst({ where: eq(schema.coaches.id, params.id) });
  if (!c || !bookable(c)) throw new HttpError(404, "This coach isn't taking bookings in EqualPath.");
  const type = (req.nextUrl.searchParams.get("session") ?? "intro") as SessionType;
  if (!SESSION_TYPES[type]) throw new HttpError(400, "Unknown session type");
  const slots = generateSlots({ windows: await windowsFor(c.id), tz: c.timezone, busy: await busyFor(c.id), minutes: SESSION_TYPES[type].minutes });
  return { coachTimezone: c.timezone, minutes: SESSION_TYPES[type].minutes, slots: slots.map((s) => s.toISOString()) };
}, { auth: "user" });
