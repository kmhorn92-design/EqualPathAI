import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));

describe("resume styles stay ATS-readable", async () => {
  const { exportPdf, exportDocx } = await import("@/lib/resume/export");
  const { extractText } = await import("@/lib/resume/extract");
  const { SAMPLE_RESUME } = await import("@/content/sample-resume");
  const { RESUME_STYLES } = await import("@/lib/resume/styles");
  for (const s of RESUME_STYLES) {
    it(`${s.name}: PDF text reads in order with whole-word headings`, async () => {
      const txt = await extractText(await exportPdf(SAMPLE_RESUME, "classic", s.id), "pdf");
      for (const h of ["SUMMARY", "EXPERIENCE", "SKILLS", "EDUCATION"]) expect(txt).toContain(h);
      expect(txt).not.toMatch(/S U M M A R Y/);
      expect(txt.toLowerCase()).toContain("alex morgan");
      expect(txt).toContain("alex.demo@example.com");
      expect(txt.indexOf("SUMMARY")).toBeLessThan(txt.indexOf("EXPERIENCE"));
      expect(txt).toContain("Assisted customers with orders and questions in a fast-paced setting");
    });
    it(`${s.name}: exported PDF and Word files parse back into the same resume`, async () => {
      const { structureText } = await import("@/lib/resume/parse");
      for (const [kind, buf] of [["pdf", await exportPdf(SAMPLE_RESUME, "classic", s.id)], ["docx", await exportDocx(SAMPLE_RESUME, "classic", s.id)]] as const) {
        const back = structureText(await extractText(buf, kind));
        const e0 = SAMPLE_RESUME.experience[0];
        expect(back.experience[0]).toMatchObject({ title: e0.title, company: e0.company, start: e0.start });
        expect(back.experience[0].bullets).toEqual(e0.bullets);
        expect(back.skills).toEqual(expect.arrayContaining(SAMPLE_RESUME.skills));
        expect(back.contact.email).toBe(SAMPLE_RESUME.contact.email);
      }
    });
    it(`${s.name}: Word export contains every bullet`, async () => {
      const txt = await extractText(await exportDocx(SAMPLE_RESUME, "classic", s.id), "docx");
      for (const e of SAMPLE_RESUME.experience) for (const b of e.bullets) expect(txt).toContain(b);
    });
  }
});
