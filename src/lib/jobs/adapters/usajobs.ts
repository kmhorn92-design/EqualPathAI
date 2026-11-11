import type { JobAdapter, NormalizedJob } from "../types";
import { getJson } from "../http";

type UJ = { SearchResult: { SearchResultItems: { MatchedObjectId: string; MatchedObjectDescriptor: {
  PositionID: string; PositionTitle: string; OrganizationName: string; PositionLocationDisplay: string; PositionURI: string; ApplyURI: string[];
  PositionRemuneration: { MinimumRange: string; MaximumRange: string; RateIntervalCode: string }[]; PublicationStartDate: string; ApplicationCloseDate: string;
  PositionSchedule: { Name: string }[]; UserArea?: { Details?: { JobSummary?: string; TeleworkEligible?: boolean; RemoteIndicator?: boolean; LowGrade?: string } };
} }[] } };

/** USAJOBS Search API — official U.S. federal jobs API (free key from developer.usajobs.gov). */
export const usajobs: JobAdapter = {
  id: "usajobs",
  name: "USAJOBS (U.S. federal government)",
  authorization: { method: "API key (Authorization-Key header) + registered email User-Agent", envVars: ["USAJOBS_API_KEY", "USAJOBS_USER_AGENT_EMAIL"], termsUrl: "https://developer.usajobs.gov/", notes: "Free key. Must send the email you registered as User-Agent." },
  cadence: "daily",
  attribution: "Source: USAJOBS.gov",
  permittedFields: ["title", "company", "location", "description", "applyUrl", "postedAt", "expiresAt", "workMode", "employmentType", "salaryMin", "salaryMax", "salaryCurrency", "salaryPeriod"],
  requiresPartnerApproval: false,
  configured: () => Boolean(process.env.USAJOBS_API_KEY && process.env.USAJOBS_USER_AGENT_EMAIL),
  async fetchJobs({ signal, log }) {
    const out: NormalizedJob[] = [];
    const kw = process.env.USAJOBS_KEYWORDS ?? "";
    for (let page = 1; page <= 2; page++) {
      const data = await getJson<UJ>(`https://data.usajobs.gov/api/search?ResultsPerPage=250&DatePosted=3&Page=${page}${kw ? `&Keyword=${encodeURIComponent(kw)}` : ""}`, {
        signal, headers: { Host: "data.usajobs.gov", "User-Agent": process.env.USAJOBS_USER_AGENT_EMAIL!, "Authorization-Key": process.env.USAJOBS_API_KEY! },
      });
      const items = data.SearchResult.SearchResultItems;
      for (const { MatchedObjectDescriptor: d } of items) {
        const pay = d.PositionRemuneration?.[0];
        const det = d.UserArea?.Details;
        out.push({
          sourceJobId: d.PositionID, company: d.OrganizationName, title: d.PositionTitle, location: d.PositionLocationDisplay,
          workMode: det?.RemoteIndicator ? "REMOTE" : det?.TeleworkEligible ? "HYBRID" : "ONSITE",
          employmentType: d.PositionSchedule?.[0]?.Name ?? null, industry: "Government",
          salaryMin: pay ? Math.round(Number(pay.MinimumRange)) : null, salaryMax: pay ? Math.round(Number(pay.MaximumRange)) : null,
          salaryCurrency: "USD", salaryPeriod: pay?.RateIntervalCode === "PA" ? "year" : pay?.RateIntervalCode === "PH" ? "hour" : pay?.RateIntervalCode ?? null,
          description: det?.JobSummary ?? "", applyUrl: d.ApplyURI?.[0] ?? d.PositionURI,
          postedAt: new Date(d.PublicationStartDate), expiresAt: d.ApplicationCloseDate ? new Date(d.ApplicationCloseDate) : null,
        });
      }
      log(`usajobs page ${page} → ${items.length}`);
      if (items.length < 250) break;
    }
    return out;
  },
};
