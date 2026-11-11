import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler, HttpError } from "@/lib/api";
import { track } from "@/lib/usage";

export const POST = handler<{ id: string }>(async ({ user, params }) => {
  const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, params.id), columns: { id: true } });
  if (!job) throw new HttpError(404, "Job not found");
  await db.insert(schema.savedJobs).values({ userId: user.id, jobId: job.id }).onConflictDoNothing();
  await track("job_saved");
  return { saved: true };
});
export const DELETE = handler<{ id: string }>(async ({ user, params }) => {
  await db.delete(schema.savedJobs).where(and(eq(schema.savedJobs.userId, user.id), eq(schema.savedJobs.jobId, params.id)));
  return { saved: false };
});
