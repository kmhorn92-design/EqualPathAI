import type { JobAdapter } from "../types";

/**
 * Indeed and LinkedIn do not offer open job-search APIs. Access is only through approved
 * partner programs. These adapters stay disabled until you hold a signed agreement and
 * credentials; we NEVER scrape either site. Until then the UI offers plain outbound
 * search links (permitted), clearly labeled as external.
 */
function partner(id: string, name: string, termsUrl: string, envVars: string[]): JobAdapter {
  return {
    id, name,
    authorization: { method: "Approved partner program only", envVars, termsUrl, notes: "Requires written partner approval. Scraping is prohibited by the site's terms and by EqualPath policy." },
    cadence: "per partner agreement",
    attribution: `Per ${name} partner agreement`,
    permittedFields: [],
    requiresPartnerApproval: true,
    configured: () => envVars.every((v) => process.env[v]) && process.env[`${id.toUpperCase().replace(/-/g, "_")}_APPROVED`] === "true",
    async fetchJobs() {
      throw new Error(`${name} integration requires an approved partner agreement. Implement the client per your agreement's API spec.`);
    },
  };
}
export const indeedPartner = partner("indeed-partner", "Indeed Partner Program", "https://www.indeed.com/hire/partner", ["INDEED_PARTNER_CLIENT_ID", "INDEED_PARTNER_CLIENT_SECRET"]);
export const linkedinPartner = partner("linkedin-partner", "LinkedIn Talent Solutions Partner", "https://learn.microsoft.com/en-us/linkedin/talent/", ["LINKEDIN_PARTNER_CLIENT_ID", "LINKEDIN_PARTNER_CLIENT_SECRET"]);

/** Plain external search links (no data retrieval) — allowed without partnership. */
export const externalSearchLinks = (q: string, loc: string) => [
  { name: "Indeed", url: `https://www.indeed.com/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(loc)}` },
  { name: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}&location=${encodeURIComponent(loc)}` },
  { name: "USAJOBS", url: `https://www.usajobs.gov/Search/Results?k=${encodeURIComponent(q)}&l=${encodeURIComponent(loc)}` },
  { name: "CareerOneStop", url: `https://www.careeronestop.org/Toolkit/Jobs/find-jobs-results.aspx?keyword=${encodeURIComponent(q)}&location=${encodeURIComponent(loc)}` },
];
