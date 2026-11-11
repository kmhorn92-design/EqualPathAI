import { and, asc, count, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { encryptOpt } from "@/lib/crypto";
import { FORMATS, isBookable, isValidTimeZone, SESSION_TYPES, type SessionType } from "@/lib/booking";
import { ACTIVE, bookable, coachForUser, notify, serialize, windowsFor } from "@/lib/bookings-server";
import { ownVersion } from "@/lib/resume/access";
import { track } from "@/lib/usage";

const input = z.object({
  coachId: z.string().max(64),
  sessionType: z.enum(Object.keys(SESSION_TYPES) as [SessionType, ...SessionType[]]),
  format: z.enum(FORMATS),
  startsAt: z.string().datetime(),
  arrangement: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional().nullable(),
  goal: z.string().trim().max(1500).optional().nullable(),
  accessibility: z.string().trim().max(500).optional().nullable(),
  sharedResumeVersionId: z.string().max(64).optional().nullable(),
  clientTimezone: z.string().max(64).optional().nullable(),
});

export const GET = handler(async ({ user }) => {
  const now = new Date(Date.now() - 30 * 864e5);
  const mine = await db.select({ b: schema.bookings, coachName: schema.coaches.name }).from(schema.bookings)
    .innerJoin(schema.coaches, eq(schema.coaches.id, schema.bookings.coachId))
    .where(and(eq(schema.bookings.userId, user.id), gte(schema.bookings.startsAt, now))).orderBy(asc(schema.bookings.startsAt));
  const coach = await coachForUser(user.id);
  const asCoach = coach ? await db.select({ b: schema.bookings, clientName: schema.users.name }).from(schema.bookings)
    .innerJoin(schema.users, eq(schema.users.id, schema.bookings.userId))
    .where(and(eq(schema.bookings.coachId, coach.id), gte(schema.bookings.startsAt, now))).orderBy(asc(schema.bookings.startsAt)) : [];
  return {
    asClient: mine.map((r) => serialize(r.b, "client", { coachName: r.coachName })),
    asCoach: asCoach.map((r) => serialize(r.b, "coach", { clientName: r.clientName })),
  };
});

export const POST = handler(async ({ req, user }) => {
  const i = await body(req, input);
  const coach = await db.query.coaches.findFirst({ where: eq(schema.coaches.id, i.coachId) });
  if (!coach || !bookable(coach)) throw new HttpError(404, "This coach isn't taking bookings in EqualPath.");
  if (coach.userId === user.id) throw new HttpError(400, "You can't book a session with yourself.");
  if (!coach.formats.includes(i.format)) throw new HttpError(400, "This coach doesn't offer that format.");
  if (i.sharedResumeVersionId) await ownVersion(user.id, i.sharedResumeVersionId); // must be the client's own version
  const [{ n }] = await db.select({ n: count() }).from(schema.bookings)
    .where(and(eq(schema.bookings.userId, user.id), inArray(schema.bookings.status, ["REQUESTED"]), gte(schema.bookings.startsAt, new Date())));
  if (n >= 5) throw new HttpError(429, "You have 5 pending requests. Wait for a coach to respond, or cancel one first.");

  const type = SESSION_TYPES[i.sessionType];
  const startsAt = new Date(i.startsAt);
  const endsAt = new Date(startsAt.getTime() + type.minutes * 6e4);
  const windows = await windowsFor(coach.id);

  const booking = await db.transaction(async (tx) => {
    // Serialize concurrent bookings for this coach, then re-check availability inside the lock.
    await tx.execute(sql`select id from coaches where id = ${coach.id} for update`);
    const busy = await tx.select({ startsAt: schema.bookings.startsAt, endsAt: schema.bookings.endsAt }).from(schema.bookings)
      .where(and(eq(schema.bookings.coachId, coach.id), inArray(schema.bookings.status, [...ACTIVE]), gte(schema.bookings.endsAt, new Date())));
    if (!isBookable(startsAt, { windows, tz: coach.timezone, busy, minutes: type.minutes })) throw new HttpError(409, "That time was just taken or is no longer available. Please pick another.");
    const [b] = await tx.insert(schema.bookings).values({
      coachId: coach.id, userId: user.id, sessionType: i.sessionType, format: i.format, startsAt, endsAt, arrangement: i.arrangement ?? null,
      goalEnc: encryptOpt(i.goal), accessibilityEnc: encryptOpt(i.accessibility), sharedResumeVersionId: i.sharedResumeVersionId || null,
      clientTimezone: i.clientTimezone && isValidTimeZone(i.clientTimezone) ? i.clientTimezone : null,
    }).returning();
    return b;
  });

  const when = startsAt.toLocaleString("en-US", { timeZone: coach.timezone, dateStyle: "medium", timeStyle: "short" });
  await notify(coach.userId!, "New session request", `${type.name} requested for ${when} (your time). Please confirm or decline.`, "/coach-portal");
  await notify(user.id, "Session requested", `${type.name} with ${coach.name}. You'll be notified when they confirm.`, "/sessions");
  await track("booking_requested");
  return { id: booking.id, status: booking.status };
}, { auth: "user", limit: { key: "booking", max: 20, windowMs: 60 * 60_000 } });
