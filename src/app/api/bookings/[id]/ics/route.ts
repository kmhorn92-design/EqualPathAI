import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler, HttpError } from "@/lib/api";
import { toIcs, SESSION_TYPES, type SessionType } from "@/lib/booking";
import { coachForUser } from "@/lib/bookings-server";

export const GET = handler<{ id: string }>(async ({ user, params }) => {
  const b = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, params.id) });
  const myCoach = await coachForUser(user.id);
  if (!b || (b.userId !== user.id && myCoach?.id !== b.coachId)) throw new HttpError(404, "Session not found");
  if (b.status !== "CONFIRMED") throw new HttpError(409, "Calendar files are available once a session is confirmed.");
  const coach = await db.query.coaches.findFirst({ where: eq(schema.coaches.id, b.coachId) });
  const type = SESSION_TYPES[b.sessionType as SessionType];
  const ics = toIcs({
    id: b.id, title: `${type?.name ?? "Coaching session"}: EqualPath AI`, startsAt: b.startsAt, endsAt: b.endsAt,
    description: `Career coaching session with ${coach?.name ?? "your coach"} via EqualPath AI.${b.meetingUrl ? `\nJoin: ${b.meetingUrl}` : ""}`,
    location: b.format === "in-person" ? coach?.location : b.format === "phone" ? "Phone call" : b.meetingUrl, url: b.meetingUrl,
  });
  return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="equalpath-session.ics"`, "cache-control": "no-store" } });
});
