import Link from "next/link";
import { and, asc, eq, gte } from "drizzle-orm";
import { Users } from "lucide-react";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { serialize } from "@/lib/bookings-server";
import { PageHeader } from "@/components/ui";
import { SessionList, type Sess } from "@/components/coach/SessionList";

export const metadata = { title: "My coaching sessions" };
export const dynamic = "force-dynamic";
export default async function Sessions() {
  const u = await requirePageUser();
  const rows = await db.select({ b: schema.bookings, coachName: schema.coaches.name }).from(schema.bookings)
    .innerJoin(schema.coaches, eq(schema.coaches.id, schema.bookings.coachId))
    .where(and(eq(schema.bookings.userId, u.id), gte(schema.bookings.startsAt, new Date(Date.now() - 60 * 864e5)))).orderBy(asc(schema.bookings.startsAt));
  return (
    <>
      <PageHeader kicker="Coaching" title="My sessions" subtitle="Requests, confirmed sessions, meeting links and notes from your coaches." actions={<Link href="/coaches" className="btn-ghost"><Users size={16} />Find a coach</Link>} />
      <SessionList initial={rows.map((r) => serialize(r.b, "client", { coachName: r.coachName }) as Sess)} />
    </>
  );
}
