import { and, desc, eq, isNull, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler } from "@/lib/api";

/** Also materializes due application reminders into notifications (idempotent per app/day). */
export const GET = handler(async ({ user }) => {
  const due = await db.select().from(schema.applications).where(and(eq(schema.applications.userId, user.id), lte(schema.applications.reminderAt, new Date())));
  for (const a of due) {
    const title = `Follow up: ${a.company}`;
    const exists = await db.query.notifications.findFirst({ where: and(eq(schema.notifications.userId, user.id), eq(schema.notifications.title, title), isNull(schema.notifications.readAt)) });
    if (!exists) await db.insert(schema.notifications).values({ userId: user.id, title, body: `Reminder for ${a.title}. Consider a short, polite follow-up.`, href: "/tracker" });
    await db.update(schema.applications).set({ reminderAt: null }).where(eq(schema.applications.id, a.id));
  }
  const items = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, user.id)).orderBy(desc(schema.notifications.createdAt)).limit(20);
  return { items };
});
export const POST = handler(async ({ user }) => {
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));
  return { ok: true };
});
