import type { JobAdapter, NormalizedJob } from "../types";
import { getJson, list } from "../http";
import { inferWorkMode, stripHtml } from "../normalize";

/**
 * Authorized employer / staffing-agency feeds. Partners give us a JSON feed URL of
 * schema.org JobPosting objects (the same format Google for Jobs uses) under a data-sharing
 * agreement. Configure EMPLOYER_FEEDS="Agency Name|https://feed.url,Other|https://...".
 */
type JP = { identifier?: { value?: string } | string; title: string; hiringOrganization?: { name?: string }; jobLocation?: { address?: { addressLocality?: string; addressRegion?: string } } | { address?: { addressLocality?: string; addressRegion?: string } }[];
  jobLocationType?: string; employmentType?: string | string[]; datePosted?: string; validThrough?: string; description?: string; url?: string; directApply?: boolean;
  baseSalary?: { currency?: string; value?: { minValue?: number; maxValue?: number; value?: number; unitText?: string } } };

export function mapJobPosting(p: JP, fallbackCompany: string): NormalizedJob {
  const loc = Array.isArray(p.jobLocation) ? p.jobLocation[0] : p.jobLocation;
  const a = loc?.address;
  const id = typeof p.identifier === "string" ? p.identifier : p.identifier?.value ?? p.url ?? p.title;
  const sv = p.baseSalary?.value;
  return {
    sourceJobId: String(id), company: p.hiringOrganization?.name ?? fallbackCompany, title: p.title,
    location: [a?.addressLocality, a?.addressRegion].filter(Boolean).join(", "),
    workMode: p.jobLocationType === "TELECOMMUTE" ? "REMOTE" : inferWorkMode(p.title, p.description),
    employmentType: Array.isArray(p.employmentType) ? p.employmentType.join(", ") : p.employmentType ?? null,
    salaryMin: sv?.minValue ?? sv?.value ?? null, salaryMax: sv?.maxValue ?? sv?.value ?? null, salaryCurrency: p.baseSalary?.currency ?? null, salaryPeriod: sv?.unitText?.toLowerCase() ?? null,
    description: stripHtml(p.description ?? ""), applyUrl: p.url ?? "", postedAt: p.datePosted ? new Date(p.datePosted) : null, expiresAt: p.validThrough ? new Date(p.validThrough) : null,
  };
}

export const employerFeeds: JobAdapter = {
  id: "employer-feeds",
  name: "Authorized employer & staffing-agency feeds",
  authorization: { method: "Data-sharing agreement + feed URL (optional bearer token)", envVars: ["EMPLOYER_FEEDS", "EMPLOYER_FEEDS_TOKEN"], termsUrl: "https://schema.org/JobPosting", notes: "Add a feed only after the employer/agency has authorized redistribution in writing." },
  cadence: "daily",
  attribution: "Posted via the employer's authorized feed",
  permittedFields: ["title", "company", "location", "description", "applyUrl", "postedAt", "expiresAt", "workMode", "employmentType", "salaryMin", "salaryMax", "salaryCurrency", "salaryPeriod"],
  requiresPartnerApproval: false,
  completeFeed: true, // an employer feed lists all of its open jobs
  configured: () => list(process.env.EMPLOYER_FEEDS).length > 0,
  async fetchJobs({ signal, log }) {
    const out: NormalizedJob[] = [];
    for (const entry of list(process.env.EMPLOYER_FEEDS)) {
      const [name, url] = entry.split("|");
      try {
        const headers = process.env.EMPLOYER_FEEDS_TOKEN ? { Authorization: `Bearer ${process.env.EMPLOYER_FEEDS_TOKEN}` } : undefined;
        const data = await getJson<JP[] | { jobs: JP[] }>(url, { signal, headers });
        const arr = Array.isArray(data) ? data : data.jobs;
        arr.forEach((p) => out.push({ ...mapJobPosting(p, name), sourceJobId: `${name}:${mapJobPosting(p, name).sourceJobId}` }));
        log(`feed:${name} → ${arr.length}`);
      } catch (e) { log(`feed:${name} failed: ${(e as Error).message}`); }
    }
    return out;
  },
};
