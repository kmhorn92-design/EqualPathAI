import type { JobAdapter, NormalizedJob } from "../types";
import { getJson, list } from "../http";
import { inferWorkMode, stripHtml, inferIndustry } from "../normalize";

type GH = { jobs: { id: number; title: string; updated_at: string; first_published?: string; location: { name: string }; absolute_url: string; content: string; departments?: { name: string }[]; company_name?: string }[]; meta?: unknown };

/** Greenhouse Job Board API — public endpoint employers publish for job boards. */
export const greenhouse: JobAdapter = {
  id: "greenhouse",
  name: "Greenhouse (employer job boards)",
  authorization: {
    method: "Public Job Board API (employer-published)",
    envVars: ["GREENHOUSE_BOARDS"],
    termsUrl: "https://developers.greenhouse.io/job-board.html",
    notes: "Only list board tokens of employers who publish a public Greenhouse board. Link applicants to the employer's own posting.",
  },
  cadence: "daily",
  attribution: "Listing from the employer's Greenhouse career site",
  permittedFields: ["title", "company", "location", "description", "applyUrl", "postedAt", "workMode", "industry"],
  requiresPartnerApproval: false,
  completeFeed: true, // each fetch is the full list of open jobs
  configured: () => list(process.env.GREENHOUSE_BOARDS).length > 0,
  async fetchJobs({ signal, log }) {
    const out: NormalizedJob[] = [];
    for (const entry of list(process.env.GREENHOUSE_BOARDS)) {
      const [token, display] = entry.split(":");
      try {
        const data = await getJson<GH>(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`, { signal });
        for (const j of data.jobs) {
          const desc = stripHtml(j.content ?? "");
          out.push({
            sourceJobId: `${token}:${j.id}`, company: display ?? j.company_name ?? token, title: j.title, location: j.location?.name ?? "",
            workMode: inferWorkMode(j.location?.name, j.title), description: desc, applyUrl: j.absolute_url,
            postedAt: new Date(j.first_published ?? j.updated_at), industry: inferIndustry(j.title, j.departments?.[0]?.name),
          });
        }
        log(`greenhouse:${token} → ${data.jobs.length}`);
      } catch (e) { log(`greenhouse:${token} failed: ${(e as Error).message}`); }
    }
    return out;
  },
};
