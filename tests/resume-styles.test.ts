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
    it(`${s.name}: Word export contains every bullet`, async () => {
      const txt = await extractText(await exportDocx(SAMPLE_RESUME, "classic", s.id), "docx");
      for (const e of SAMPLE_RESUME.experience) for (const b of e.bullets) expect(txt).toContain(b);
    });
  }
});
