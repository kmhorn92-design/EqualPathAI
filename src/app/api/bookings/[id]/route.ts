import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { encryptOpt } from "@/lib/crypto";
import { CLIENT_CANCEL_CUTOFF_HOURS, SESSION_TYPES, type SessionType } from "@/lib/booking";
import { coachForUser, notify } from "@/lib/bookings-server";
import { audit } from "@/lib/usage";

const input = z.object({
  action: z.enum(["cancel", "confirm", "decline", "complete"]),
  meetingUrl: z.string().url().max(500).refine((u) => u.startsWith("https://"), "Meeting link must start with https://").optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional(),
});

export const PATCH = handler<{ id: string }>(async ({ req, user, params }) => {
  const i = await body(req, input);
  const b = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, params.id) });
  if (!b) throw new HttpError(404, "Session not found");
  const coach = await db.query.coaches.findFirst({ where: eq(schema.coaches.id, b.coachId) });
  const myCoach = await coachForUser(user.id);
  const isClient = b.userId === user.id, isCoach = !!myCoach && myCoach.id === b.coachId;
  if (!isClient && !isCoach) throw new HttpError(404, "Session not found");
  const name = SESSION_TYPES[b.sessionType as SessionType]?.name ?? "Session";
  const when = (tz: string | null | undefined) => b.startsAt.toLocaleString("en-US", { timeZone: tz ?? "UTC", dateStyle: "medium", timeStyle: "short" }) + (tz ? "" : " UTC");
  const set = (v: Partial<typeof schema.bookings.$inferInsert>) => db.update(schema.bookings).set(v).where(eq(schema.bookings.id, b.id));

  if (i.action === "cancel") {
    if (!["REQUESTED", "CONFIRMED"].includes(b.status)) throw new HttpError(409, "This session can't be cancelled.");
    if (isClient && !isCoach) {
      if (b.status === "CONFIRMED" && b.startsAt.getTime() - Date.now() < CLIENT_CANCEL_CUTOFF_HOURS * 36e5) throw new HttpError(409, `Confirmed sessions can be cancelled up to ${CLIENT_CANCEL_CUTOFF_HOURS} hours before the start. Please message your coach.`);
      await set({ status: "CANCELLED" });
      if (coach?.userId) await notify(coach.userId, "Session cancelled by client", `${name} on ${when(coach.timezone)} was cancelled. That time is open again.`, "/coach-portal");
    } else {
      await set({ status: "CANCELLED", coachNoteEnc: encryptOpt(i.note) ?? b.coachNoteEnc });
      await notify(b.userId, "Your coach cancelled a session", `${name} on ${when(b.clientTimezone)} was cancelled.${i.note ? ` Note: ${i.note}` : ""}`, "/sessions");
    }
  } else {
    if (!isCoach) throw new HttpError(403, "Only the coach can do that.");
    if (i.action === "confirm") {
      if (b.status !== "REQUESTED") throw new HttpError(409, "Only requested sessions can be confirmed.");
      if (b.format === "video" && !i.meetingUrl) throw new HttpError(400, "Add a video meeting link (https://…) so your client can join.");
      await set({ status: "CONFIRMED", meetingUrl: i.meetingUrl || null, coachNoteEnc: encryptOpt(i.note) });
      await notify(b.userId, "Session confirmed 🎉", `${name} with ${coach!.name} on ${when(b.clientTimezone)}. Add it to your calendar from My Sessions.`, "/sessions");
    } else if (i.action === "decline") {
      if (b.status !== "REQUESTED") throw new HttpError(409, "Only requested sessions can be declined.");
      await set({ status: "DECLINED", coachNoteEnc: encryptOpt(i.note) });
      await notify(b.userId, "Session request declined", `${coach!.name} can't take ${name} on ${when(b.clientTimezone)}.${i.note ? ` Note: ${i.note}` : ""} Try another time or coach.`, "/sessions");
    } else {
      if (b.status !== "CONFIRMED" || b.startsAt > new Date()) throw new HttpError(409, "Only confirmed sessions that have started can be marked complete.");
      await set({ status: "COMPLETED", coachNoteEnc: encryptOpt(i.note) ?? b.coachNoteEnc });
      await notify(b.userId, "Session complete", `Thanks for meeting with ${coach!.name}.${i.note ? ` Follow-up note: ${i.note}` : ""}`, "/sessions");
    }
  }
  await audit(user.id, `booking.${i.action}`, b.id);
  return { ok: true };
});
