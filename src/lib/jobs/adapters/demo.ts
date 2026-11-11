import type { JobAdapter, NormalizedJob, WorkMode } from "../types";

/**
 * DEMO adapter — development only. Jobs are flagged isDemo=true, prefixed "[DEMO]",
 * excluded from live counts and alerts, and hidden unless the viewer opts into demo data.
 * Disabled automatically when NODE_ENV=production.
 */
const ROLES: [string, string, string][] = [
  ["Patient Care Technician", "Healthcare", "Entry level"], ["Junior Frontend Developer", "Technology", "Entry level"], ["Customer Support Specialist", "Customer Service", "Entry level"],
  ["Administrative Assistant", "Administration", "Mid level"], ["Staff Accountant", "Finance", "Mid level"], ["After-School Tutor", "Education", "Entry level"],
  ["Warehouse Associate", "Logistics", "Entry level"], ["Content Designer", "Creative", "Mid level"], ["Front Desk Agent", "Hospitality", "Entry level"],
  ["Program Analyst", "Government", "Mid level"], ["Data Analyst", "Technology", "Mid level"], ["Medical Billing Specialist", "Healthcare", "Mid level"],
];
const COS = ["DEMO Northwind Health", "DEMO Contoso Labs", "DEMO Fabrikam Staffing", "DEMO Tailspin Logistics", "DEMO Adatum Finance"];
const LOCS: [string, WorkMode][] = [["Remote (US)", "REMOTE"], ["Baltimore, MD", "HYBRID"], ["Chicago, IL", "ONSITE"], ["Atlanta, GA", "HYBRID"], ["Houston, TX", "ONSITE"], ["Remote (US)", "REMOTE"]];

export function demoJobs(n = 24): NormalizedJob[] {
  return Array.from({ length: n }, (_, i) => {
    const [title, industry, exp] = ROLES[i % ROLES.length]; const [location, workMode] = LOCS[i % LOCS.length];
    const salary = 38000 + ((i * 7919) % 60000);
    return {
      sourceJobId: `demo-${i}`, company: COS[i % COS.length], title: `[DEMO] ${title}`, location, workMode, industry, experienceLevel: exp,
      employmentType: i % 5 === 0 ? "Part-time" : "Full-time", salaryMin: i % 3 ? salary : null, salaryMax: i % 3 ? salary + 12000 : null,
      salaryCurrency: i % 3 ? "USD" : null, salaryPeriod: i % 3 ? "year" : null,
      description: `DEMO LISTING — not a real job. Synthetic listing for development only.\n\nResponsibilities include customer service, communication, scheduling, data entry and teamwork. Required: 1+ years experience, Microsoft Office. Preferred: CRM experience, bilingual.`,
      applyUrl: `https://example.com/demo-apply/${i}`, postedAt: new Date(Date.now() - (i % 6) * 864e5 / 2),
    };
  });
}

export const demo: JobAdapter = {
  id: "demo", name: "DEMO data (development only)", isDemo: true,
  authorization: { method: "none — synthetic", envVars: ["ENABLE_DEMO_JOBS"], termsUrl: "", notes: "Never enabled in production." },
  cadence: "on demand", attribution: "DEMO — synthetic listing", permittedFields: ["title", "company", "location", "description", "applyUrl", "postedAt", "workMode", "employmentType", "industry", "experienceLevel", "salaryMin", "salaryMax", "salaryCurrency", "salaryPeriod"],
  requiresPartnerApproval: false,
  configured: () => process.env.ENABLE_DEMO_JOBS === "true" && process.env.NODE_ENV !== "production",
  async fetchJobs() { return demoJobs(); },
};
