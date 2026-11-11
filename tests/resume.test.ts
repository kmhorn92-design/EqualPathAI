import { describe, it, expect } from "vitest";
import { structureText, resumeCorpus } from "@/lib/resume/parse";
import { sniffType } from "@/lib/resume/extract";
import { analyzeAgainstJob, ruleSuggestions, guardSuggestion, applySuggestions } from "@/lib/resume/analyze";
import { grounded } from "@/lib/resume/ai";
import { exportDocx, exportPdf } from "@/lib/resume/export";

const RAW = `Jordan Rivera
Baltimore, MD | (410) 555-0134 | jordan@example.com

SUMMARY
Customer service professional.

EXPERIENCE
Customer Service Representative | BrightCall | Baltimore, MD   Mar 2021 - Present
• Responsible for handling 60 inbound calls per day using Zendesk
• Helped with training new hires on de-escalation

EDUCATION
Community College of Baltimore County
Associate of Arts 2020

SKILLS
Customer Service, Microsoft Office`;

describe("resume parsing", () => {
  const r = structureText(RAW);
  it("extracts contact info", () => {
    expect(r.contact.name).toBe("Jordan Rivera");
    expect(r.contact.email).toBe("jordan@example.com");
    expect(r.contact.location).toBe("Baltimore, MD");
  });
  it("extracts roles, dates and bullets verbatim", () => {
    expect(r.experience).toHaveLength(1);
    expect(r.experience[0]).toMatchObject({ title: "Customer Service Representative", company: "BrightCall", start: "Mar 2021", end: "Present" });
    expect(r.experience[0].bullets[0]).toBe("Responsible for handling 60 inbound calls per day using Zendesk");
  });
  it("extracts education and skills", () => {
    expect(r.education[0].school).toContain("Community College");
    expect(r.skills).toEqual(["Customer Service", "Microsoft Office"]);
  });
  it("sniffs file types by magic bytes, not by name alone", () => {
    expect(sniffType(Buffer.from("%PDF-1.7 ..."), "x.docx")).toBe("pdf");
    expect(sniffType(Buffer.from("hello"), "x.pdf")).toBeNull();
    expect(sniffType(Buffer.from("plain text"), "cv.txt")).toBe("txt");
  });
});

describe("job comparison", () => {
  const r = structureText(RAW);
  const jd = "Requirements: 2+ years customer service. CRM experience (Zendesk) required. Conflict resolution. Data entry. Bilingual preferred.";
  const a = analyzeAgainstJob(r, jd);
  it("reports literal matches and gaps without an ATS score", () => {
    expect(a.matched).toEqual(expect.arrayContaining(["Customer Service", "CRM", "Conflict Resolution"]));
    expect(a.missing).toEqual(expect.arrayContaining(["Data Entry", "Bilingual"]));
    expect(a).not.toHaveProperty("score");
    expect(a.notes.join(" ")).toMatch(/not an ATS score/);
  });
  it("rule suggestions only rephrase", () => {
    const s = ruleSuggestions(r, a);
    const bullet = s.find((x) => x.kind === "bullet")!;
    expect(bullet.after).toBe("Handled 60 inbound calls per day using Zendesk");
    const skill = s.find((x) => x.kind === "skill");
    // skills evidenced in experience but missing from the Skills list
    expect(skill?.after).toContain("CRM");
    expect(skill?.after).not.toContain("Data Entry");
  });
  it("applies only accepted suggestions", () => {
    const s = ruleSuggestions(r, a).map((x, i) => ({ ...x, status: i === 0 ? ("accepted" as const) : ("rejected" as const) }));
    const next = applySuggestions(r, s);
    expect(next.experience[0].bullets[0]).toBe(s[0].after);
    expect(next.skills).toEqual(r.skills);
  });
});

describe("anti-fabrication guard", () => {
  const corpus = resumeCorpus(structureText(RAW));
  it("blocks invented metrics", () => {
    expect(guardSuggestion("Handled calls", "Handled 120 calls, improving CSAT 30%", corpus).ok).toBe(false);
  });
  it("blocks invented skills", () => {
    expect(guardSuggestion("Handled calls using Zendesk", "Handled calls using Zendesk and Salesforce with Python automation", corpus).ok).toBe(false);
  });
  it("allows faithful rephrasing", () => {
    expect(guardSuggestion("Responsible for handling 60 inbound calls per day using Zendesk", "Handled 60 inbound calls daily in Zendesk", corpus).ok).toBe(true);
  });
  it("grounding check rejects text not present in the source", () => {
    expect(grounded("Helped with training new hires on de-escalation", RAW)).toBe(true);
    expect(grounded("Led a global team of 40 engineers at Google", RAW)).toBe(false);
  });
});

describe("exports", () => {
  const r = structureText(RAW);
  it("produces a DOCX (zip) file", async () => {
    const b = await exportDocx(r, "classic");
    expect(b.subarray(0, 2).toString()).toBe("PK");
  });
  it("produces a PDF", async () => {
    const b = await exportPdf(r, "healthcare");
    expect(b.subarray(0, 5).toString()).toBe("%PDF-");
    expect(b.length).toBeGreaterThan(800);
  });
});

describe("file extraction round-trip", () => {
  it("re-reads an exported PDF and DOCX into the same structure", async () => {
    const { extractText } = await import("@/lib/resume/extract");
    const r = structureText(RAW);
    for (const [kind, buf] of [["pdf", await exportPdf(r, "classic")], ["docx", await exportDocx(r, "classic")]] as const) {
      const back = structureText(await extractText(buf, kind));
      expect(back.contact.email).toBe("jordan@example.com");
      expect(back.experience[0].title).toBe("Customer Service Representative");
      expect(back.experience[0].bullets).toContain("Responsible for handling 60 inbound calls per day using Zendesk");
    }
  });
  it("reads PDFs that use object streams (PDF 1.5+, as Word/Google Docs produce)", async () => {
    const { PDFDocument, StandardFonts } = await import("pdf-lib");
    const { extractText } = await import("@/lib/resume/extract");
    const d = await PDFDocument.create(); const f = await d.embedFont(StandardFonts.Helvetica);
    d.addPage().drawText("Taylor Kim  taylor@example.com", { x: 50, y: 700, size: 12, font: f });
    const txt = await extractText(Buffer.from(await d.save({ useObjectStreams: true })), "pdf");
    expect(txt).toContain("taylor@example.com");
  });
});

describe("past tense conversion", () => {
  it("handles regular, doubled, -e, -y and irregular verbs", async () => {
    const { pastTense } = await import("@/lib/resume/analyze");
    expect(pastTense("scheduling")).toBe("Scheduled");
    expect(pastTense("planning")).toBe("Planned");
    expect(pastTense("processing")).toBe("Processed");
    expect(pastTense("coordinating")).toBe("Coordinated");
    expect(pastTense("leading")).toBe("Led");
    expect(pastTense("answering")).toBe("Answered");
  });
});
