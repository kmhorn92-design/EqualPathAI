import type { JobAdapter, NormalizedJob } from "../types";
import { getJson } from "../http";
import { inferIndustry, inferWorkMode, stripHtml } from "../normalize";

type Muse = { page?: number; page_count?: number; results?: {
  id: number; name?: string; contents?: string; publication_date?: string; type?: string;
  locations?: { name: string }[]; levels?: { name: string }[]; categories?: { name: string }[];
  company?: { name: string }; refs?: { landing_page?: string };
}[] };

const LEVEL: Record<string, string> = { "Internship": "Internship", "Entry Level": "Entry level", "Mid Level": "Mid level", "Senior Level": "Senior", "management": "Manager" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The Muse public Jobs API — live US listings across many industries. Requires a free API key (register your app at themuse.com/developers); requests without a key are refused. */
export const themuse: JobAdapter = {
  id: "themuse",
  name: "The Muse",
  authorization: { method: "Public Jobs API with registered app key", envVars: ["MUSE_API_KEY"], termsUrl: "https://www.themuse.com/developers/api/v2", notes: "Credit The Muse and link applicants to the original posting. Register an app at https://www.themuse.com/developers to get a key." },
  cadence: "daily",
  attribution: "Jobs via The Muse",
  permittedFields: ["title", "company", "location", "description", "applyUrl", "postedAt", "workMode", "experienceLevel", "industry"],
  requiresPartnerApproval: false,
  configured: () => Boolean(process.env.MUSE_API_KEY),
  async fetchJobs({ signal, log }) {
    const out: NormalizedJob[] = [];
    const pages = Math.min(Number(process.env.MUSE_PAGES ?? 10), 50);
    const key = `&api_key=${encodeURIComponent(process.env.MUSE_API_KEY ?? "")}`;
    for (let page = 1; page <= pages; page++) {
      let data: Muse;
      try {
        data = await getJson<Muse>(`https://www.themuse.com/api/public/jobs?page=${page}&descending=true${key}`, { signal });
      } catch (e) {
        if (out.length) { log(`themuse stopped at page ${page}: ${(e as Error).message}`); break; } // keep what we have
        throw e;
      }
      for (const j of data.results ?? []) {
        if (!j.name || !j.refs?.landing_page || !j.company?.name) continue;
        const locs = j.locations ?? [];
        const loc = locs.map((l) => l.name).join("; ");
        const remote = /flexible \/ remote|remote/i.test(loc);
        out.push({
          sourceJobId: String(j.id), company: j.company.name, title: j.name,
          location: remote && locs.length === 1 ? "Remote" : loc,
          workMode: remote ? (locs.length > 1 ? "HYBRID" : "REMOTE") : inferWorkMode(loc, j.name),
          experienceLevel: LEVEL[j.levels?.[0]?.name ?? ""] ?? null,
          industry: inferIndustry(j.name, j.categories?.[0]?.name),
          description: stripHtml(j.contents ?? ""), applyUrl: j.refs.landing_page, postedAt: j.publication_date ? new Date(j.publication_date) : null,
        });
      }
      log(`themuse page ${page} → ${data.results?.length ?? 0}`);
      if (!data.results?.length || (data.page_count !== undefined && page >= data.page_count)) break;
      await sleep(400); // be polite
    }
    return out;
  },
};
