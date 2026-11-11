import Link from "next/link";
import { and, asc, eq, gte } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { coachForUser, serialize, windowsFor } from "@/lib/bookings-server";
import { Empty, PageHeader } from "@/components/ui";
import { CoachPortal, type CoachSess } from "@/components/coach/CoachPortal";

export const metadata = { title: "Coach Portal" };
export const dynamic = "force-dynamic";
export default async function CoachPortalPage() {
  const u = await requirePageUser();
  const c = await coachForUser(u.id);
  if (!c) return (<>
    <PageHeader kicker="Coach Portal" title="Coach with EqualPath" />
    <Empty title="Your account isn't linked to a coach listing" body="Submit a listing from the Career Coaches page. Once it's approved, you can set availability and take session requests here." action={<Link href="/coaches" className="btn-primary">Go to Career Coaches</Link>} />
  </>);
  const [windows, rows] = await Promise.all([
    windowsFor(c.id),
    db.select({ b: schema.bookings, clientName: schema.users.name }).from(schema.bookings).innerJoin(schema.users, eq(schema.users.id, schema.bookings.userId))
      .where(and(eq(schema.bookings.coachId, c.id), gte(schema.bookings.startsAt, new Date(Date.now() - 60 * 864e5)))).orderBy(asc(schema.bookings.startsAt)),
  ]);
  return (
    <>
      <PageHeader kicker="Coach Portal" title={`Welcome, ${c.name.replace("[DEMO] ", "")}`} subtitle="Set when you're available, then confirm or decline session requests. Clients see open times converted to their own time zone." />
      <CoachPortal coachName={c.name} approved={c.status === "APPROVED"} initialSettings={{ focus: c.focus, formats: c.formats, timezone: c.timezone, bookingEnabled: c.bookingEnabled }} initialWindows={windows}
        sessions={rows.map((r) => serialize(r.b, "coach", { clientName: r.clientName }) as CoachSess)} />
    </>
  );
}
