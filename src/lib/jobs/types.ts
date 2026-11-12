export type WorkMode = "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";

export type NormalizedJob = {
  sourceJobId: string;
  company: string;
  title: string;
  location: string;
  workMode: WorkMode;
  employmentType?: string | null;
  industry?: string | null;
  experienceLevel?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  description: string;
  applyUrl: string;
  postedAt?: Date | null;
  expiresAt?: Date | null;
};

/**
 * Every adapter declares — in code, reviewable in PRs and visible in the admin dashboard —
 * where data comes from, how it's authorized, how often it updates, the attribution owed,
 * and which fields we are permitted to store/display.
 */
export interface JobAdapter {
  id: string;
  name: string;
  authorization: { method: string; envVars: string[]; termsUrl: string; notes: string };
  cadence: string;
  attribution: string;
  permittedFields: (keyof NormalizedJob)[];
  /** Partner programs (e.g. Indeed, LinkedIn) need written approval before enabling. */
  requiresPartnerApproval: boolean;
  /**
   * true when each fetch returns the source's COMPLETE list of open jobs (e.g. an employer's Greenhouse board),
   * so a job missing from the fetch has closed. false for aggregators/APIs that only return the newest N jobs:
   * those jobs age out via the freshness sweep instead (stale after JOB_STALE_AFTER_HOURS, removed after
   * JOB_PARTIAL_MAX_AGE_DAYS without being seen again).
   */
  completeFeed?: boolean;
  /** Development-only data. Never mixed into live counts. */
  isDemo?: boolean;
  configured(): boolean;
  fetchJobs(ctx: { signal: AbortSignal; log: (m: string) => void }): Promise<NormalizedJob[]>;
}
