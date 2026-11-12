import { describe, it, expect, vi, afterEach } from "vitest";
import { canonicalKey, dedupe, inferWorkMode, validateJob, stripHtml, inferExperience } from "@/lib/jobs/normalize";
import { greenhouse } from "@/lib/jobs/adapters/greenhouse";
import { lever } from "@/lib/jobs/adapters/lever";
import { mapJobPosting } from "@/lib/jobs/adapters/employer-feed";
import { indeedPartner, linkedinPartner } from "@/lib/jobs/adapters/partners";
import { demo } from "@/lib/jobs/adapters/demo";
import { ADAPTERS } from "@/lib/jobs/registry";
import { explainMatch } from "@/lib/jobs/match";
import type { NormalizedJob } from "@/lib/jobs/types";

vi.mock("@/db", () => ({ db: {}, schema: {}, pool: {} }));
const { withRetry } = await import("@/lib/jobs/ingest");

const base: NormalizedJob = { sourceJobId: "1", company: "Acme, Inc.", title: "Support Specialist", location: "Austin, TX, United States", workMode: "REMOTE", description: "x", applyUrl: "https://acme.example/jobs/1" };
afterEach(() => vi.unstubAllGlobals());

describe("normalization & dedup", () => {
  it("canonicalizes company/title/location", () => {
    expect(canonicalKey(base)).toBe(canonicalKey({ ...base, company: "ACME", location: "Austin, TX" }));
  });
  it("dedupes keeping the most recent", () => {
    const a = { ...base, postedAt: new Date("2026-01-01") }, b = { ...base, sourceJobId: "2", company: "Acme LLC", postedAt: new Date("2026-02-01") };
    const r = dedupe([a, b]);
    expect(r.jobs).toHaveLength(1); expect(r.duplicates).toBe(1); expect(r.jobs[0].sourceJobId).toBe("2");
  });
  it("rejects expired, non-https, and incomplete listings", () => {
    expect(validateJob({ ...base, expiresAt: new Date(Date.now() - 1000) }).ok).toBe(false);
    expect(validateJob({ ...base, applyUrl: "http://acme.example" }).ok).toBe(false);
    expect(validateJob({ ...base, title: "" }).ok).toBe(false);
    expect(validateJob(base).ok).toBe(true);
  });
  it("infers work mode and experience", () => {
    expect(inferWorkMode("Hybrid - Denver")).toBe("HYBRID");
    expect(inferWorkMode("Remote, US")).toBe("REMOTE");
    expect(inferExperience("Senior Data Engineer")).toBe("Senior");
    expect(inferExperience("Customer Service Intern")).toBe("Internship");
  });
  it("strips HTML", () => { expect(stripHtml("&lt;p&gt;Hi &amp; <b>bye</b>&lt;/p&gt;")).toBe("Hi & bye"); });
});

describe("adapters", () => {
  it("every adapter declares source, authorization, cadence, attribution and permitted fields", () => {
    for (const a of ADAPTERS) {
      expect(a.id && a.name && a.cadence && a.attribution).toBeTruthy();
      expect(a.authorization.method).toBeTruthy();
      expect(Array.isArray(a.permittedFields)).toBe(true);
    }
  });
  it("Indeed/LinkedIn never run without partner approval", async () => {
    expect(indeedPartner.requiresPartnerApproval && linkedinPartner.requiresPartnerApproval).toBe(true);
    expect(indeedPartner.configured()).toBe(false);
    await expect(indeedPartner.fetchJobs({ signal: new AbortController().signal, log: () => {} })).rejects.toThrow(/partner/);
  });
  it("demo adapter is disabled in production", () => {
    vi.stubEnv("ENABLE_DEMO_JOBS", "true"); vi.stubEnv("NODE_ENV", "production");
    expect(demo.configured()).toBe(false);
    vi.unstubAllEnvs();
  });
  it("maps Greenhouse responses", async () => {
    vi.stubEnv("GREENHOUSE_BOARDS", "acme:Acme Corp");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ jobs: [{ id: 9, title: "Patient Coordinator", updated_at: "2026-11-01T00:00:00Z", location: { name: "Remote - US" }, absolute_url: "https://boards.greenhouse.io/acme/jobs/9", content: "&lt;p&gt;Help patients&lt;/p&gt;" }] }))));
    const jobs = await greenhouse.fetchJobs({ signal: new AbortController().signal, log: () => {} });
    expect(jobs[0]).toMatchObject({ sourceJobId: "acme:9", company: "Acme Corp", workMode: "REMOTE", description: "Help patients", industry: "Healthcare" });
    vi.unstubAllEnvs();
  });
  it("maps Lever responses including disclosed salary", async () => {
    vi.stubEnv("LEVER_COMPANIES", "acme");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ id: "a1", text: "Warehouse Associate", createdAt: 1762000000000, hostedUrl: "https://jobs.lever.co/acme/a1", applyUrl: "https://jobs.lever.co/acme/a1/apply", workplaceType: "onsite", categories: { location: "Reno, NV", commitment: "Full-time" }, salaryRange: { min: 40000, max: 45000, currency: "USD", interval: "per-year-salary" } }]))));
    const [j] = await lever.fetchJobs({ signal: new AbortController().signal, log: () => {} });
    expect(j).toMatchObject({ workMode: "ONSITE", salaryMin: 40000, employmentType: "Full-time", industry: "Logistics" });
    vi.unstubAllEnvs();
  });
  it("maps schema.org JobPosting feeds", () => {
    const j = mapJobPosting({ title: "Teller", identifier: { value: "T-1" }, hiringOrganization: { name: "Bank" }, jobLocationType: "TELECOMMUTE", url: "https://bank.example/t1", validThrough: "2030-01-01" }, "Fallback");
    expect(j).toMatchObject({ sourceJobId: "T-1", company: "Bank", workMode: "REMOTE" });
  });
});

describe("retry", () => {
  it("retries transient failures then succeeds", async () => {
    let n = 0;
    const r = await withRetry(async () => { if (++n < 3) throw new Error("boom"); return "ok"; }, 3, 1);
    expect(r).toEqual({ value: "ok", attempts: 3 });
  });
  it("does not retry 4xx permission errors", async () => {
    let n = 0;
    await expect(withRetry(async () => { n++; throw Object.assign(new Error("403"), { status: 403 }); }, 3, 1)).rejects.toThrow();
    expect(n).toBe(1);
  });
});

describe("match explanation", () => {
  it("explains overlaps and gaps with no probability score", () => {
    const m = explainMatch("Need customer service, CRM, and data entry", ["Customer Service"], "Used Zendesk daily", { workPreference: "REMOTE" }, { workMode: "REMOTE", location: "Remote" });
    expect(m.overlap).toEqual(expect.arrayContaining(["Customer Service", "CRM"]));
    expect(m.gaps).toContain("Data Entry");
    expect(JSON.stringify(m)).not.toMatch(/probab|likel|%/i);
  });
});

describe("no-key adapters", async () => {
  const { themuse } = await import("@/lib/jobs/adapters/themuse");
  const { remotive } = await import("@/lib/jobs/adapters/remotive");
  it("maps The Muse responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ page: 0, page_count: 1, results: [
      { id: 101, name: "Medical Assistant", contents: "<p>Help patients</p>", publication_date: "2026-11-10T12:00:00Z", locations: [{ name: "Chicago, IL" }], levels: [{ name: "Entry Level" }], categories: [{ name: "Healthcare" }], company: { name: "Acme Health" }, refs: { landing_page: "https://www.themuse.com/jobs/acme/medical-assistant" } },
      { id: 102, name: "Support Specialist", contents: "", publication_date: "2026-11-10T12:00:00Z", locations: [{ name: "Flexible / Remote" }], levels: [], categories: [], company: { name: "Beta" }, refs: { landing_page: "https://www.themuse.com/jobs/beta/support" } },
    ] }))));
    const jobs = await themuse.fetchJobs({ signal: new AbortController().signal, log: () => {} });
    expect(jobs[0]).toMatchObject({ sourceJobId: "101", company: "Acme Health", experienceLevel: "Entry level", industry: "Healthcare", description: "Help patients", workMode: "UNKNOWN" });
    expect(jobs[1]).toMatchObject({ workMode: "REMOTE", location: "Remote" });
  });
  it("maps Remotive responses and links back to Remotive", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ jobs: [
      { id: 7, url: "https://remotive.com/remote-jobs/customer-support/agent-7", title: "Customer Support Agent", company_name: "Gamma", category: "Customer Service", job_type: "full_time", publication_date: "2026-11-09T10:00:00", candidate_required_location: "USA", description: "<b>Help</b> customers" },
    ] }))));
    const [j] = await remotive.fetchJobs({ signal: new AbortController().signal, log: () => {} });
    expect(j).toMatchObject({ workMode: "REMOTE", location: "Remote (USA)", employmentType: "Full-time", applyUrl: "https://remotive.com/remote-jobs/customer-support/agent-7", description: "Help customers", industry: "Customer Service" });
    expect(remotive.attribution).toMatch(/Remotive/);
  });
  it("both are on by default and can be turned off", () => {
    expect(themuse.configured() && remotive.configured()).toBe(true);
    vi.stubEnv("MUSE_ENABLED", "false"); expect(themuse.configured()).toBe(false); vi.unstubAllEnvs();
  });
});
