import { NextResponse, type NextRequest } from "next/server";
import { runAll } from "@/lib/jobs/ingest";
import { authorizedCron } from "@/lib/cron";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Daily scheduler entrypoint (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). */
export async function GET(req: NextRequest) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const r = await runAll("cron");
  return NextResponse.json({ counts: r.counts, sweep: r.sweep, sources: r.results.map((x) => ({ id: x.sourceId, status: x.status, inserted: x.inserted, updated: x.updated })) });
}
