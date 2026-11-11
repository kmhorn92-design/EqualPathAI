import { NextResponse, type NextRequest } from "next/server";
import { enforceRetention } from "@/lib/retention";
import { authorizedCron } from "@/lib/cron";

export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await enforceRetention());
}
