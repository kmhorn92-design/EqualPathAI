import type { JobAdapter, NormalizedJob } from "../types";
import { envVal, getJson } from "../http";
import { inferWorkMode, inferIndustry } from "../normalize";

type AZ = { results: { id: string; title: string; company: { display_name: string }; location: { display_name: string }; description: string; redirect_url: string;
  created: string; salary_min?: number; salary_max?: number; salary_is_predicted?: string; contract_time?: string; category?: { label: string } }[] };

/** Adzuna category tags (US). Override with ADZUNA_CATEGORIES="healthcare-nursing-jobs,it-jobs" or "all". */
export const ADZUNA_DEFAULT_CATEGORIES = ["healthcare-nursing-jobs", "it-jobs", "admin-jobs", "customer-services-jobs", "accounting-finance-jobs", "logistics-warehouse-jobs", "teaching-jobs", "social-work-jobs"];
export const adzunaCategories = () => {
  const v = (process.env.ADZUNA_CATEGORIES ?? "").trim();
  if (v === "all") return [null];
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : ADZUNA_DEFAULT_CATEGORIES;
};

/** Adzuna aggregator API — licensed job data; requires attribution and linking via redirect_url. */
export const adzuna: JobAdapter = {
  id: "adzuna",
  name: "Adzuna (licensed aggregator)",
  authorization: { method: "API app_id + app_key", envVars: ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"], termsUrl: "https://developer.adzuna.com/docs/terms_of_service", notes: "Display 'Jobs by Adzuna' attribution. Always link via redirect_url." },
  cadence: "daily",
  attribution: "Jobs by Adzuna",
  permittedFields: ["title", "company", "location", "description", "applyUrl", "postedAt", "workMode", "employmentType", "salaryMin", "salaryMax", "industry"],
  requiresPartnerApproval: false,
  configured: () => Boolean(envVal("ADZUNA_APP_ID") && envVal("ADZUNA_APP_KEY")),
  async fetchJobs({ signal, log }) {
    const out: NormalizedJob[] = [];
    const country = process.env.ADZUNA_COUNTRY ?? "us";
    const pages = Math.min(Number(process.env.ADZUNA_PAGES ?? 1), 5); // per category; free tier allows ~250 calls/day
    const cats = adzunaCategories();
    for (const category of cats) for (let page = 1; page <= pages; page++) {
      const q = new URLSearchParams({ app_id: envVal("ADZUNA_APP_ID"), app_key: envVal("ADZUNA_APP_KEY"), results_per_page: "50", max_days_old: process.env.ADZUNA_MAX_DAYS ?? "3", sort_by: "date" });
      if (process.env.ADZUNA_WHAT) q.set("what", process.env.ADZUNA_WHAT);
      if (process.env.ADZUNA_WHERE) q.set("where", process.env.ADZUNA_WHERE);
      if (category) q.set("category", category);
      let data: AZ;
      try { data = await getJson<AZ>(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${q}`, { signal }); }
      catch (e) { if (cats.length > 1 && out.length) { log(`adzuna ${category} skipped: ${(e as Error).message}`); break; } throw e; }
      for (const r of data.results) {
        const disclosed = r.salary_is_predicted !== "1"; // never show modeled salaries as disclosed
        out.push({
          sourceJobId: r.id, company: r.company?.display_name ?? "Unknown employer", title: r.title.replace(/<[^>]+>/g, ""), location: r.location?.display_name ?? "",
          workMode: inferWorkMode(r.title, r.description, r.location?.display_name), employmentType: r.contract_time?.replace("_", "-") ?? null,
          industry: inferIndustry(r.title, r.category?.label), salaryMin: disclosed ? r.salary_min ?? null : null, salaryMax: disclosed ? r.salary_max ?? null : null,
          salaryCurrency: disclosed && r.salary_min ? "USD" : null, salaryPeriod: disclosed && r.salary_min ? "year" : null,
          description: r.description.replace(/<[^>]+>/g, ""), applyUrl: r.redirect_url, postedAt: new Date(r.created),
        });
      }
      log(`adzuna ${category ?? "all"} page ${page} → ${data.results.length}`);
      if (data.results.length < 50) break;
    }
    return out;
  },
};
