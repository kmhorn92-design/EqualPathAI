import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { audit } from "@/lib/usage";

/** Pause or resume a job source. Credentials stay in .env; this only controls whether ingestion runs. */
export const PATCH = handler<{ id: string }>(async ({ req, user, params }) => {
  const { paused } = await body(req, z.object({ paused: z.boolean() }));
  const [s] = await db.update(schema.jobSources).set({ pausedAt: paused ? new Date() : null }).where(eq(schema.jobSources.id, params.id)).returning({ id: schema.jobSources.id });
  if (!s) throw new HttpError(404, "Source not found. Run ingestion once to register sources.");
  await audit(`admin:${user.email}`, paused ? "source.pause" : "source.resume", s.id);
  return { ok: true };
}, { auth: "admin" });
