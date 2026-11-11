import "server-only";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { HttpError } from "./api";
import { decryptOpt } from "./crypto";
import { SESSION_TYPES, type SessionType } from "./booking";

export const ACTIVE = ["REQUESTED", "CONFIRMED"] as const;

export async function coachForUser(userId: string) {
  return db.query.coaches.findFirst({ where: eq(schema.coaches.userId, userId) });
}
export async function requireCoach(userId: string) {
  const c = await coachForUser(userId);
  if (!c) throw new HttpError(403, "This account isn't linked to a coach profile.");
  return c;
}

export async function windowsFor(coachId: string) {
  return db.select({ weekday: schema.coachAvailability.weekday, startMinute: schema.coachAvailability.startMinute, endMinute: schema.coachAvailability.endMinute })
    .from(schema.coachAvailability).where(eq(schema.coachAvailability.coachId, coachId));
}

type Exec = Pick<typeof db, "select">;
export async function busyFor(coachId: string, exec: Exec = db) {
  return exec.select({ startsAt: schema.bookings.startsAt, endsAt: schema.bookings.endsAt }).from(schema.bookings)
    .where(and(eq(schema.bookings.coachId, coachId), inArray(schema.bookings.status, [...ACTIVE]), gte(schema.bookings.endsAt, new Date())));
}

export function bookable(c: typeof schema.coaches.$inferSelect) {
  return c.status === "APPROVED" && c.bookingEnabled && !!c.userId;
}

export function priceLabel(c: { priceFrom: number | null }, type: SessionType) {
  if (SESSION_TYPES[type].free || c.priceFrom === 0) return "Free";
  return c.priceFrom ? `From $${c.priceFrom}, paid to the coach directly` : "Price set by the coach";
}

export type BookingRow = typeof schema.bookings.$inferSelect;

/** Serializes a booking for one party. Each side sees only what it needs; client email is never exposed to coaches. */
export function serialize(b: BookingRow, view: "client" | "coach", extra: { coachName?: string; clientName?: string | null }) {
  const base = {
    id: b.id, status: b.status, sessionType: b.sessionType, sessionName: SESSION_TYPES[b.sessionType as SessionType]?.name ?? b.sessionType,
    format: b.format, startsAt: b.startsAt.toISOString(), endsAt: b.endsAt.toISOString(), arrangement: b.arrangement,
    meetingUrl: b.status === "CONFIRMED" ? b.meetingUrl : null, coachNote: decryptOpt(b.coachNoteEnc), createdAt: b.createdAt.toISOString(),
    goal: decryptOpt(b.goalEnc), accessibility: decryptOpt(b.accessibilityEnc), resumeShared: !!b.sharedResumeVersionId,
  };
  return view === "client"
    ? { ...base, coachId: b.coachId, coachName: extra.coachName ?? "Coach" }
    : { ...base, clientName: extra.clientName || "EqualPath member", clientTimezone: b.clientTimezone };
}
export type ClientBooking = ReturnType<typeof serialize> & { coachName: string; coachId: string };
export type CoachBooking = ReturnType<typeof serialize> & { clientName: string; clientTimezone: string | null };

export async function notify(userId: string, title: string, body: string, href: string) {
  await db.insert(schema.notifications).values({ userId, title, body, href });
}
