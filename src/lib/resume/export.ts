import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from "docx";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { ResumeData } from "./types";
import { getTemplate, type Template } from "./templates";

const TITLES = { summary: "Summary", experience: "Experience", education: "Education", skills: "Skills", certifications: "Certifications", projects: "Projects" };
const heading = (t: Template, k: keyof typeof TITLES) => (t.headingCase === "upper" ? TITLES[k].toUpperCase() : TITLES[k]);
const dates = (a: string, b: string) => [a, b].filter(Boolean).join(" – ");

type Block = { kind: "h" | "line" | "bold" | "bullet" | "gap"; text: string; right?: string };

/** Single-column linear structure shared by both exporters (ATS-readable reading order). */
export function toBlocks(r: ResumeData, t: Template): Block[] {
  const b: Block[] = [];
  for (const sec of t.sectionOrder) {
    if (sec === "summary" && r.summary) b.push({ kind: "h", text: heading(t, sec) }, { kind: "line", text: r.summary });
    if (sec === "experience" && r.experience.length) {
      b.push({ kind: "h", text: heading(t, sec) });
      for (const e of r.experience) {
        b.push({ kind: "bold", text: [e.title, e.company].filter(Boolean).join(", "), right: dates(e.start, e.end) });
        if (e.location) b.push({ kind: "line", text: e.location });
        e.bullets.filter(Boolean).forEach((x) => b.push({ kind: "bullet", text: x }));
        b.push({ kind: "gap", text: "" });
      }
    }
    if (sec === "education" && r.education.length) {
      b.push({ kind: "h", text: heading(t, sec) });
      for (const e of r.education) {
        b.push({ kind: "bold", text: [e.degree, e.field].filter(Boolean).join(", ") || e.school, right: e.end });
        if (e.degree || e.field) b.push({ kind: "line", text: e.school });
        if (e.details) b.push({ kind: "line", text: e.details });
      }
    }
    if (sec === "skills" && r.skills.length) b.push({ kind: "h", text: heading(t, sec) }, { kind: "line", text: r.skills.join(", ") });
    if (sec === "certifications" && r.certifications.length) {
      b.push({ kind: "h", text: heading(t, sec) });
      r.certifications.forEach((c) => b.push({ kind: "bullet", text: c }));
    }
    if (sec === "projects" && r.projects.length) {
      b.push({ kind: "h", text: heading(t, sec) });
      r.projects.forEach((p) => { b.push({ kind: "bold", text: p.name }); if (p.description) b.push({ kind: "line", text: p.description }); });
    }
  }
  return b;
}

const contactLine = (r: ResumeData) => [r.contact.location, r.contact.phone, r.contact.email, ...r.contact.links].filter(Boolean).join(" | ");

export async function exportDocx(r: ResumeData, templateId: string): Promise<Buffer> {
  const t = getTemplate(templateId);
  const font = t.font === "Helvetica" ? "Arial" : t.font === "Times" ? "Times New Roman" : t.font;
  const color = t.accent.replace("#", "");
  const children: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.contact.name || "Your Name", bold: true, size: 32, font })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: contactLine(r), size: 19, font })] }),
  ];
  for (const bl of toBlocks(r, t)) {
    if (bl.kind === "h") children.push(new Paragraph({ spacing: { before: 200, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 1 } }, children: [new TextRun({ text: bl.text, bold: true, size: 22, color, font })] }));
    else if (bl.kind === "bold") children.push(new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: bl.text, bold: true, size: 21, font }), ...(bl.right ? [new TextRun({ text: `  |  ${bl.right}`, size: 20, font })] : [])] }));
    else if (bl.kind === "bullet") children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: bl.text, size: 20, font })] }));
    else if (bl.kind === "gap") children.push(new Paragraph({ children: [] }));
    else children.push(new Paragraph({ children: [new TextRun({ text: bl.text, size: 20, font })] }));
  }
  const doc = new Document({
    creator: "EqualPath AI", title: `${r.contact.name} Resume`,
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children }],
  });
  return Packer.toBuffer(doc);
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.replace(/[^\x20-\x7E -ÿ–—•’‘“”]/g, "").split(/\s+/);
  const lines: string[] = []; let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > width && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
const safe = (s: string) => s.replace(/[–—]/g, "-").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/•/g, "-");

export async function exportPdf(r: ResumeData, templateId: string): Promise<Buffer> {
  const t = getTemplate(templateId);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${r.contact.name} Resume`); pdf.setCreator("EqualPath AI");
  const [reg, bold] = t.font === "Times" || t.font === "Georgia"
    ? [await pdf.embedFont(StandardFonts.TimesRoman), await pdf.embedFont(StandardFonts.TimesRomanBold)]
    : [await pdf.embedFont(StandardFonts.Helvetica), await pdf.embedFont(StandardFonts.HelveticaBold)];
  const hex = t.accent.replace("#", ""); const accent = rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
  const W = 612, H = 792, M = 54, CW = W - 2 * M;
  let page = pdf.addPage([W, H]); let y = H - M;
  const ensure = (h: number) => { if (y - h < M) { page = pdf.addPage([W, H]); y = H - M; } };
  const draw = (text: string, f: PDFFont, size: number, x = M, color = rgb(0.1, 0.1, 0.12), width = CW) => {
    for (const ln of wrap(safe(text), f, size, width)) { ensure(size + 4); page.drawText(ln, { x, y: y - size, size, font: f, color }); y -= size + 3.5; }
  };
  const name = safe(r.contact.name || "Your Name");
  page.drawText(name, { x: (W - bold.widthOfTextAtSize(name, 18)) / 2, y: y - 18, size: 18, font: bold }); y -= 26;
  const cl = safe(contactLine(r));
  for (const ln of wrap(cl, reg, 9.5, CW)) { page.drawText(ln, { x: (W - reg.widthOfTextAtSize(ln, 9.5)) / 2, y: y - 9.5, size: 9.5, font: reg }); y -= 13; }
  y -= 4;
  for (const bl of toBlocks(r, t)) {
    if (bl.kind === "h") { y -= 8; ensure(22); draw(bl.text, bold, 11, M, accent); page.drawLine({ start: { x: M, y: y + 1 }, end: { x: W - M, y: y + 1 }, thickness: 0.7, color: accent }); y -= 5; }
    else if (bl.kind === "bold") { y -= 2; draw(bl.text + (bl.right ? `  |  ${bl.right}` : ""), bold, 10.5); }
    else if (bl.kind === "bullet") {
      const lines = wrap(safe(bl.text), reg, 10, CW - 14);
      lines.forEach((ln, i) => { ensure(14); if (i === 0) page.drawText("-", { x: M + 3, y: y - 10, size: 10, font: reg }); page.drawText(ln, { x: M + 14, y: y - 10, size: 10, font: reg }); y -= 13.5; });
    } else if (bl.kind === "gap") y -= 4;
    else draw(bl.text, reg, 10);
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false })); // classic xref for older parsers
}
