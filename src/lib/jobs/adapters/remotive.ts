import type { JobAdapter, NormalizedJob } from "../types";
import { getJson } from "../http";
import { inferExperience, inferIndustry, stripHtml } from "../normalize";

type R = { jobs: { id: number; url: string; title: string; company_name: string; category: string; job_type: string; publication_date: string; candidate_required_location: string; description: string }[] };

/**
 * Remotive public API — remote jobs. No key. Terms: attribute Remotive and link back to the Remotive
 * posting (we use their URL as the apply link), at most ~4 requests/day, don't resubmit jobs to other boards.
 */
export const remotive: JobAdapter = {
  id: "remotive",
  name: "Remotive (remote jobs)",
  authorization: { method: "Public API, no key (attribution + link-back required; ≤4 requests/day)", envVars: ["REMOTIVE_ENABLED"], termsUrl: "https://github.com/remotive-com/remote-jobs-api", notes: "Listings are delayed 24h by Remotive. Always credit Remotive and link to the Remotive posting. Set REMOTIVE_ENABLED=false to turn off." },
  cadence: "daily (max 4/day)",
  attribution: "Jobs via Remotive",
  permittedFields: ["title", "company", "location", "description", "applyUrl", "postedAt", "workMode", "employmentType", "industry", "experienceLevel"],
  requiresPartnerApproval: false,
  configured: () => process.env.REMOTIVE_ENABLED !== "false",
  async fetchJobs({ signal, log }) {
    const data = await getJson<R>("https://remotive.com/api/remote-jobs", { signal });
    log(`remotive → ${data.jobs.length}`);
    return data.jobs.map((j): NormalizedJob => ({
      sourceJobId: String(j.id), company: j.company_name, title: j.title,
      location: j.candidate_required_location ? `Remote (${j.candidate_required_location})` : "Remote", workMode: "REMOTE",
      employmentType: j.job_type ? j.job_type.replace(/_/g, "-").replace(/^\w/, (c) => c.toUpperCase()) : null,
      industry: inferIndustry(j.title, j.category), experienceLevel: inferExperience(j.title),
      description: stripHtml(j.description ?? ""), applyUrl: j.url, postedAt: new Date(j.publication_date),
    }));
  },
};
