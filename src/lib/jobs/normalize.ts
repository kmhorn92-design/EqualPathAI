import type { NormalizedJob, WorkMode } from "./types";

export function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/<\s*(br|\/p|\/li|\/h\d|\/div)\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/\b(inc|llc|ltd|corp|corporation|co|company)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Dedup key: normalized company + title + location. Combined with (source, sourceJobId) uniqueness. */
export function canonicalKey(j: Pick<NormalizedJob, "company" | "title" | "location">) {
  const loc = norm(j.location).replace(/\b(united states|usa|us)\b/g, "").trim() || "any";
  return `${norm(j.company)}|${norm(j.title)}|${loc}`;
}

export function inferWorkMode(...texts: (string | null | undefined)[]): WorkMode {
  const t = texts.filter(Boolean).join(" ").toLowerCase();
  if (/\bhybrid\b/.test(t)) return "HYBRID";
  if (/\b(remote|work from home|wfh|telework|anywhere)\b/.test(t)) return "REMOTE";
  if (/\b(on-?site|in-?office|in person)\b/.test(t)) return "ONSITE";
  return "UNKNOWN";
}

export function inferExperience(title: string): string | null {
  const t = title.toLowerCase();
  if (/\b(intern|internship|apprentice)\b/.test(t)) return "Internship";
  if (/\b(entry|junior|jr\.?|associate|trainee|graduate|i)\b/.test(t)) return "Entry level";
  if (/\b(senior|sr\.?|lead|principal|staff|iii|iv)\b/.test(t)) return "Senior";
  if (/\b(director|vp|vice president|head of|chief)\b/.test(t)) return "Executive";
  if (/\b(manager|supervisor)\b/.test(t)) return "Manager";
  return "Mid level";
}

const INDUSTRY_RULES: [string, RegExp][] = [
  ["Healthcare", /\b(nurse|rn|lpn|medical|clinical|patient|health|pharmac|therap|dental|caregiver|cna|phlebotom)/i],
  ["Technology", /\b(engineer|developer|software|data|devops|it |cloud|security|product manager|ux|ui|analyst|programmer|sre)\b/i],
  ["Customer Service", /\b(customer|support|service rep|call center|contact center|client success)/i],
  ["Administration", /\b(admin|receptionist|office|clerk|assistant|coordinator|secretary)/i],
  ["Finance", /\b(accountant|accounting|finance|financial|bookkeep|payroll|auditor|tax|billing)/i],
  ["Education", /\b(teacher|tutor|instructor|educat|professor|school|curriculum)/i],
  ["Logistics", /\b(warehouse|driver|logistic|supply chain|forklift|shipping|delivery|fulfillment|dispatcher)/i],
  ["Creative", /\b(designer|writer|editor|content|marketing|video|creative|copywriter|brand)/i],
  ["Hospitality", /\b(hotel|server|cook|chef|barista|hospitality|front desk|housekeep|restaurant)/i],
  ["Government", /\b(federal|government|public sector|agency|municipal|county)\b/i],
  ["Sales", /\b(sales|account executive|business development|retail)/i],
];
export function inferIndustry(title: string, dept?: string | null): string | null {
  const t = `${title} ${dept ?? ""}`;
  return INDUSTRY_RULES.find(([, r]) => r.test(t))?.[0] ?? null;
}

export type Validation = { ok: true; job: NormalizedJob } | { ok: false; reason: string };

/** Rejects listings we cannot show honestly: missing apply URL, expired, or missing basics. */
export function validateJob(j: NormalizedJob, now = new Date()): Validation {
  if (!j.title?.trim() || !j.company?.trim()) return { ok: false, reason: "missing title/company" };
  if (!j.sourceJobId) return { ok: false, reason: "missing source id" };
  let url: URL;
  try { url = new URL(j.applyUrl); } catch { return { ok: false, reason: "invalid apply URL" }; }
  if (url.protocol !== "https:") return { ok: false, reason: "apply URL not https" };
  if (j.expiresAt && j.expiresAt < now) return { ok: false, reason: "expired" };
  if (j.postedAt && j.postedAt > new Date(now.getTime() + 864e5)) return { ok: false, reason: "posted date in future" };
  if (j.salaryMin != null && j.salaryMax != null && j.salaryMin > j.salaryMax) [j.salaryMin, j.salaryMax] = [j.salaryMax, j.salaryMin];
  return {
    ok: true,
    job: {
      ...j,
      title: j.title.trim().slice(0, 200), company: j.company.trim().slice(0, 200),
      location: (j.location || (j.workMode === "REMOTE" ? "Remote" : "Not specified")).trim().slice(0, 200),
      description: j.description.slice(0, 20000),
      industry: j.industry ?? inferIndustry(j.title),
      experienceLevel: j.experienceLevel ?? inferExperience(j.title),
    },
  };
}

/** Within-batch dedup by canonical key; keeps most recently posted. */
export function dedupe(list: NormalizedJob[]) {
  const map = new Map<string, NormalizedJob>(); let dups = 0;
  for (const j of list) {
    const k = canonicalKey(j); const prev = map.get(k);
    if (prev) { dups++; if ((j.postedAt?.getTime() ?? 0) > (prev.postedAt?.getTime() ?? 0)) map.set(k, j); }
    else map.set(k, j);
  }
  return { jobs: [...map.values()], duplicates: dups };
}
