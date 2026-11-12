import type { JobAdapter, NormalizedJob, WorkMode } from "../types";
import { getJson, list } from "../http";
import { inferWorkMode, inferIndustry } from "../normalize";

type LP = { id: string; text: string; createdAt: number; hostedUrl: string; applyUrl: string; descriptionPlain?: string; additionalPlain?: string; workplaceType?: string;
  categories: { location?: string; commitment?: string; team?: string; department?: string }; salaryRange?: { min: number; max: number; currency: string; interval: string } };

const wm: Record<string, WorkMode> = { remote: "REMOTE", hybrid: "HYBRID", onsite: "ONSITE", "on-site": "ONSITE" };

/** Lever Postings API — public endpoint employers publish for their careers pages. */
export const lever: JobAdapter = {
  id: "lever",
  name: "Lever (employer job boards)",
  authorization: { method: "Public Postings API (employer-published)", envVars: ["LEVER_COMPANIES"], termsUrl: "https://github.com/lever/postings-api", notes: "List only employers who publish a public Lever postings page." },
  cadence: "daily",
  attribution: "Listing from the employer's Lever career site",
  permittedFields: ["title", "company", "location", "description", "applyUrl", "postedAt", "workMode", "employmentType", "salaryMin", "salaryMax", "salaryCurrency", "salaryPeriod", "industry"],
  requiresPartnerApproval: false,
  completeFeed: true, // each fetch is the full list of open jobs
  configured: () => list(process.env.LEVER_COMPANIES).length > 0,
  async fetchJobs({ signal, log }) {
    const out: NormalizedJob[] = [];
    for (const entry of list(process.env.LEVER_COMPANIES)) {
      const [site, display] = entry.split(":");
      try {
        const data = await getJson<LP[]>(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`, { signal });
        for (const p of data) {
          out.push({
            sourceJobId: `${site}:${p.id}`, company: display ?? site, title: p.text, location: p.categories.location ?? "",
            workMode: wm[p.workplaceType ?? ""] ?? inferWorkMode(p.categories.location, p.text),
            employmentType: p.categories.commitment ?? null, industry: inferIndustry(p.text, p.categories.department ?? p.categories.team),
            salaryMin: p.salaryRange?.min ?? null, salaryMax: p.salaryRange?.max ?? null, salaryCurrency: p.salaryRange?.currency ?? null,
            salaryPeriod: p.salaryRange?.interval ?? null,
            description: [p.descriptionPlain, p.additionalPlain].filter(Boolean).join("\n\n"), applyUrl: p.applyUrl ?? p.hostedUrl, postedAt: new Date(p.createdAt),
          });
        }
        log(`lever:${site} → ${data.length}`);
      } catch (e) { log(`lever:${site} failed: ${(e as Error).message}`); }
    }
    return out;
  },
};
