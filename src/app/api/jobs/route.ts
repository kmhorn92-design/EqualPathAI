import { handler } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { jobQuerySchema } from "@/lib/validation";
import { searchJobs } from "@/lib/jobs/search";

export const GET = handler(async ({ req }) => {
  const q = jobQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const u = await getUser();
  return searchJobs(q, u?.id);
}, { auth: "none" });
