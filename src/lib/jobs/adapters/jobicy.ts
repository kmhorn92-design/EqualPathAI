import type { JobAdapter, NormalizedJob } from "../types";
import { getJson } from "../http";
import { inferExperience, inferIndustry, stripHtml } from "../normalize";

type J = { jobs?: {
  id: number; url?: string; jobTitle?: string; companyName?: string; jobIndustry?: string[] | string; jobType?: string[] | string;
  jobGeo?: string; jobLevel?: string; jobExcerpt?: string; jobDescription?: string; pubDate?: string;
  salaryMin?: number; salaryMax?: number; salaryCurrency?: string; salaryPeriod?: string;
}[] };

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const first = (v?: string[] | string) => (Array.isArray(v) ? v[0] : v) ?? null;
const LEVEL: Record<string, string> = { Junior: "Entry level", Midweight: "Mid level", Senior: "Senior", Manager: "Manager", Director: "Director", Any: "" };

/**
 * Jobicy public Remote Jobs API — no key. Terms: keep Jobicy as the source and link to the canonical Jobicy job URL;
 * never present listings as our own; poll at most once per hour (we run daily).
 */
export const jobicy: JobAdapter = {
  id: "jobicy",
  name: "Jobicy (remote jobs)",
  authorization: { method: "Public API, no key (attribution + canonical Jobicy link required; max 1 request/hour)", envVars: ["JOBICY_ENABLED", "JOBICY_GEO"], termsUrl: "https://github.com/Jobicy/remote-jobs-api", notes: "Always credit Jobicy and link to the Jobicy posting. Set JOBICY_ENABLED=false to turn off. JOBICY_GEO defaults to usa." },
  cadence: "daily (max 1/hour)",
  attribution: "Jobs via Jobicy",
  permittedFields: ["title", "company", "location", "description", "applyUrl", "postedAt", "workMode", "employmentType", "industry", "experienceLevel", "salaryMin", "salaryMax", "salaryCurrency"],
  requiresPartnerApproval: false,
  configured: () => process.env.JOBICY_ENABLED !== "false",
  async fetchJobs({ signal, log }) {
    const geo = encodeURIComponent(process.env.JOBICY_GEO ?? "usa");
    const data = await getJson<J>(`https://jobicy.com/api/v2/remote-jobs?count=100&geo=${geo}`, { signal });
    const jobs = data.jobs ?? [];
    log(`jobicy → ${jobs.length}`);
    const out: NormalizedJob[] = [];
    for (const j of jobs) {
      if (!j.jobTitle || !j.companyName || !j.url) continue;
      const title = decode(j.jobTitle); const industry = first(j.jobIndustry); const type = first(j.jobType);
      const yearly = !j.salaryPeriod || /year|annual/i.test(j.salaryPeriod);
      out.push({
        sourceJobId: String(j.id), title, company: decode(j.companyName),
        location: j.jobGeo ? `Remote (${decode(j.jobGeo)})` : "Remote", workMode: "REMOTE",
        employmentType: type ? decode(type) : null,
        industry: inferIndustry(title, industry ? decode(industry) : undefined),
        experienceLevel: (j.jobLevel && LEVEL[j.jobLevel]) || inferExperience(title),
        description: stripHtml(j.jobDescription || j.jobExcerpt || ""),
        applyUrl: j.url, postedAt: j.pubDate ? new Date(j.pubDate.replace(" ", "T") + (/[zZ]|[+-]\d\d:?\d\d$/.test(j.pubDate) ? "" : "Z")) : null,
        salaryMin: yearly && j.salaryMin ? Math.round(j.salaryMin) : null, salaryMax: yearly && j.salaryMax ? Math.round(j.salaryMax) : null,
        salaryCurrency: yearly && j.salaryMin ? (j.salaryCurrency ?? "USD") : null,
      });
    }
    return out;
  },
};
