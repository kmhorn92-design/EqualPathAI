import { z } from "zod";
import { body, handler, HttpError } from "@/lib/api";
import { runAll, runSource, syncSources, sweepFreshness } from "@/lib/jobs/ingest";
import { getAdapter } from "@/lib/jobs/registry";

export const runtime = "nodejs";
export const maxDuration = 300;
export const POST = handler(async ({ req, user }) => {
  const { sourceId } = await body(req, z.object({ sourceId: z.string().max(60).optional() }));
  if (!sourceId) { const r = await runAll(`admin:${user.id}`); return { counts: r.counts, results: r.results }; }
  const a = getAdapter(sourceId); if (!a) throw new HttpError(404, "Unknown source");
  await syncSources();
  const res = await runSource(a, `admin:${user.id}`); await sweepFreshness();
  return { results: [res] };
}, { auth: "admin" });
