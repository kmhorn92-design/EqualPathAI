import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType, ShadingType } from "docx";
import { PDFDocument, StandardFonts, rgb, setCharacterSpacing, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { ResumeData } from "./types";
import { getTemplate, type Template } from "./templates";
import { getStyle, type ResumeStyle } from "./styles";

const TITLES = { summary: "Summary", experience: "Experience", education: "Education", skills: "Skills", certifications: "Certifications", projects: "Projects" };
const dates = (a: string, b: string) => [a, b].filter(Boolean).join(" – ");

export type Block =
  | { kind: "h"; text: string }
  | { kind: "entry"; title: string; sub?: string; right?: string }
  | { kind: "line"; text: string }
  | { kind: "skills"; items: string[] }
  | { kind: "bullet"; text: string }
  | { kind: "gap" };

/** Single-column linear structure shared by both exporters (ATS reading order = visual order). */
export function toBlocks(r: ResumeData, t: Template): Block[] {
  const b: Block[] = [];
  const h = (k: keyof typeof TITLES) => b.push({ kind: "h", text: TITLES[k].toUpperCase() });
  for (const sec of t.sectionOrder) {
    if (sec === "summary" && r.summary) { h(sec); b.push({ kind: "line", text: r.summary }); }
    if (sec === "experience" && r.experience.length) {
      h(sec);
      for (const e of r.experience) {
        const sub = [e.title ? e.company : "", e.location].filter(Boolean).join(" · ");
        b.push({ kind: "entry", title: e.title || e.company, sub: sub || undefined, right: dates(e.start, e.end) || undefined });
        e.bullets.filter(Boolean).forEach((x) => b.push({ kind: "bullet", text: x }));
        b.push({ kind: "gap" });
      }
    }
    if (sec === "education" && r.education.length) {
      h(sec);
      for (const e of r.education) {
        b.push({ kind: "entry", title: [e.degree, e.field].filter(Boolean).join(", ") || e.school, sub: e.degree || e.field ? e.school : undefined, right: e.end || undefined });
        if (e.details) b.push({ kind: "line", text: e.details });
        b.push({ kind: "gap" });
      }
    }
    if (sec === "skills" && r.skills.length) { h(sec); b.push({ kind: "skills", items: r.skills }); }
    if (sec === "certifications" && r.certifications.length) { h(sec); r.certifications.forEach((c) => b.push({ kind: "bullet", text: c })); }
    if (sec === "projects" && r.projects.length) {
      h(sec);
      r.projects.forEach((p) => { b.push({ kind: "entry", title: p.name }); if (p.description) b.push({ kind: "line", text: p.description }); b.push({ kind: "gap" }); });
    }
  }
  while (b.at(-1)?.kind === "gap") b.pop();
  return b;
}

const contactItems = (r: ResumeData) => [r.contact.location, r.contact.phone, r.contact.email, ...r.contact.links].filter(Boolean);

/* ─────────────────────────── DOCX ─────────────────────────── */
export async function exportDocx(r: ResumeData, templateId: string, styleId?: string): Promise<Buffer> {
  const t = getTemplate(templateId); const s = getStyle(styleId);
  const font = s.family === "serif" ? "Georgia" : "Calibri";
  const hex = (c: string) => c.replace("#", "");
  const ink = hex(s.ink), muted = hex(s.muted), accent = hex(s.accent);
  const RIGHT = 12240 - 2 * 1000; // page width minus margins (twips)
  const sep = s.header === "center" ? "  |  " : "  ·  ";
  const children: Paragraph[] = [];

  if (s.header === "band") {
    const shading = { type: ShadingType.CLEAR, color: "auto", fill: hex(s.band!) };
    children.push(
      new Paragraph({ shading, spacing: { before: 0, after: 0 }, indent: { left: 200, right: 200 }, children: [new TextRun({ text: " ", size: 16 })] }),
      new Paragraph({ shading, indent: { left: 200, right: 200 }, children: [new TextRun({ text: r.contact.name || "Your Name", bold: true, size: 48, color: "FFFFFF", font })] }),
      new Paragraph({ shading, indent: { left: 200, right: 200 }, spacing: { after: 0 }, children: [new TextRun({ text: contactItems(r).join(sep), size: 19, color: "CBD5E1", font })] }),
      new Paragraph({ shading, spacing: { after: 160 }, indent: { left: 200, right: 200 }, children: [new TextRun({ text: " ", size: 16 })] }),
    );
  } else if (s.header === "center") {
    children.push(
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (r.contact.name || "Your Name").toUpperCase(), size: 40, color: ink, font, characterSpacing: 60 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: ink, space: 6 } }, children: [new TextRun({ text: contactItems(r).join(sep), size: 19, color: muted, font })] }),
    );
  } else {
    children.push(
      new Paragraph({ children: [new TextRun({ text: r.contact.name || "Your Name", bold: true, size: 52, color: ink, font })] }),
      new Paragraph({ spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: accent, space: 6 } }, children: [new TextRun({ text: contactItems(r).join(sep), size: 19, color: muted, font })] }),
    );
  }

  for (const bl of toBlocks(r, t)) {
    if (bl.kind === "h") {
      if (s.heading === "rule") children.push(new Paragraph({ spacing: { before: 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 2 } }, children: [new TextRun({ text: bl.text, bold: true, size: 19, color: accent, font, characterSpacing: 30 })] }));
      else if (s.heading === "underline") children.push(new Paragraph({ spacing: { before: 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ink, space: 2 } }, children: [new TextRun({ text: bl.text, bold: true, size: 21, color: ink, font, characterSpacing: 40 })] }));
      else children.push(new Paragraph({ spacing: { before: 240, after: 80 }, border: { left: { style: BorderStyle.SINGLE, size: 24, color: accent, space: 6 } }, children: [new TextRun({ text: bl.text, bold: true, size: 20, color: ink, font, characterSpacing: 24 })] }));
    } else if (bl.kind === "entry") {
      children.push(new Paragraph({ spacing: { before: 60 }, tabStops: [{ type: TabStopType.RIGHT, position: RIGHT }], children: [
        new TextRun({ text: bl.title, bold: true, size: 21, color: ink, font }), ...(bl.right ? [new TextRun({ text: `\t${bl.right}`, size: 19, color: muted, font })] : []) ] }));
      if (bl.sub) children.push(new Paragraph({ children: [new TextRun({ text: bl.sub, size: 20, font, italics: s.id === "executive", bold: s.id === "spotlight", color: s.id === "spotlight" ? accent : muted })] }));
    } else if (bl.kind === "bullet") children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: [new TextRun({ text: bl.text, size: 20, color: ink, font })] }));
    else if (bl.kind === "skills") children.push(new Paragraph({ children: bl.items.flatMap((x, i) => [...(i ? [new TextRun({ text: "  ·  ", size: 20, color: s.id === "executive" ? muted : accent, font })] : []), new TextRun({ text: x, size: 20, color: ink, font })]) }));
    else if (bl.kind === "gap") children.push(new Paragraph({ spacing: { after: 40 }, children: [] }));
    else children.push(new Paragraph({ children: [new TextRun({ text: bl.text, size: 20, color: ink, font })] }));
  }
  const doc = new Document({
    creator: "EqualPath AI", title: `${r.contact.name} Resume`,
    sections: [{ properties: { page: { margin: { top: s.header === "band" ? 500 : 800, bottom: 800, left: 1000, right: 1000 } } }, children }],
  });
  return Packer.toBuffer(doc);
}

/* ─────────────────────────── PDF ─────────────────────────── */
const safe = (s: string) => s.replace(/[–—]/g, "-").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[•·]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
const DOT = "\u2022"; // "•" is in WinAnsi, so it is real text: parsers see bullets and skill separators
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = []; let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > width && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
const toRgb = (h: string): RGB => { const x = h.replace("#", ""); return rgb(parseInt(x.slice(0, 2), 16) / 255, parseInt(x.slice(2, 4), 16) / 255, parseInt(x.slice(4, 6), 16) / 255); };

export async function exportPdf(r: ResumeData, templateId: string, styleId?: string): Promise<Buffer> {
  const t = getTemplate(templateId); const s: ResumeStyle = getStyle(styleId);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${r.contact.name} Resume`); pdf.setCreator("EqualPath AI");
  const serif = s.family === "serif";
  const reg = await pdf.embedFont(serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
  const bold = await pdf.embedFont(serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
  const ital = await pdf.embedFont(serif ? StandardFonts.TimesRomanItalic : StandardFonts.HelveticaOblique);
  const ink = toRgb(s.ink), muted = toRgb(s.muted), accent = toRgb(s.accent), hair = toRgb("#E2E8F0"), white = rgb(1, 1, 1);
  const W = 612, H = 792, M = 54, CW = W - 2 * M;
  const sz = serif ? 10.5 : 10; // body size (serif runs small)
  let page: PDFPage = pdf.addPage([W, H]); let y = H - M;
  const ensure = (h: number) => { if (y - h < M) { page = pdf.addPage([W, H]); y = H - M; } };
  const text = (str: string, x: number, size: number, f: PDFFont, color: RGB) => page.drawText(str, { x, y: y - size, size, font: f, color });
  const para = (str: string, f: PDFFont, size: number, color: RGB, x = M, width = CW, lead = 1.38) => {
    for (const ln of wrap(str, f, size, width)) { ensure(size * lead); text(ln, x, size, f, color); y -= size * lead; }
  };
  const spaced = (str: string, f: PDFFont, size: number, spacing: number) => [...str].reduce((w, ch) => w + f.widthOfTextAtSize(ch, size) + spacing, -spacing);
  const TRACK = 0.5; // letter-spacing; kept small so pdf.js-based ATS parsers read whole words
  // One text run with PDF character spacing (Tc), so parsers read "SUMMARY", not "S U M M A R Y".
  const drawSpaced = (str: string, x: number, size: number, f: PDFFont, color: RGB, spacing: number) => {
    page.pushOperators(setCharacterSpacing(spacing)); page.drawText(str, { x, y: y - size, size, font: f, color }); page.pushOperators(setCharacterSpacing(0));
  };
  const name = safe(r.contact.name || "Your Name");
  const sep = s.header === "center" ? "  |  " : "   -   ";
  const contact = safe(contactItems(r).join(sep));

  // Header
  if (s.header === "band") {
    const lines = wrap(contact, reg, 9.5, CW);
    const bandH = 36 + 26 + lines.length * 13 + 26;
    page.drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: toRgb(s.band!) });
    y = H - 36; text(name, M, 24, bold, white); y -= 32;
    for (const ln of lines) { text(ln, M, 9.5, reg, toRgb("#CBD5E1")); y -= 13; }
    y -= 8; page.drawRectangle({ x: M, y: y - 3, width: 34, height: 3, color: accent });
    y = H - bandH - 14;
  } else if (s.header === "center") {
    const up = name.toUpperCase(); const nw = spaced(up, reg, 20, TRACK * 1.5);
    drawSpaced(up, (W - nw) / 2, 20, reg, ink, TRACK * 1.5); y -= 28;
    for (const ln of wrap(contact, reg, 9.5, CW)) { text(ln, (W - reg.widthOfTextAtSize(ln, 9.5)) / 2, 9.5, reg, muted); y -= 13; }
    y -= 4; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: ink }); page.drawLine({ start: { x: M, y: y - 2.5 }, end: { x: W - M, y: y - 2.5 }, thickness: 0.8, color: ink }); y -= 10;
  } else {
    text(name, M, 26, bold, ink); y -= 33;
    for (const ln of wrap(contact, reg, 9.5, CW)) { text(ln, M, 9.5, reg, muted); y -= 13; }
    y -= 6; page.drawRectangle({ x: M, y: y - 3, width: 30, height: 3, color: accent }); y -= 10;
  }

  // Body
  const blocks = toBlocks(r, t);
  for (let i = 0; i < blocks.length; i++) {
    const bl = blocks[i];
    if (bl.kind === "h") {
      y -= 12; ensure(40); // keep heading with at least one line after it
      if (s.heading === "rule") {
        const w = spaced(bl.text, bold, 9, TRACK); drawSpaced(bl.text, M, 9, bold, accent, TRACK);
        page.drawLine({ start: { x: M + w + 8, y: y - 4.5 }, end: { x: W - M, y: y - 4.5 }, thickness: 0.6, color: hair }); y -= 17;
      } else if (s.heading === "underline") {
        drawSpaced(bl.text, M, 10.5, bold, ink, TRACK); y -= 14;
        page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: ink }); y -= 8;
      } else {
        page.drawRectangle({ x: M, y: y - 11, width: 3.2, height: 11.5, color: accent });
        drawSpaced(bl.text, M + 10, 10, bold, ink, TRACK); y -= 18;
      }
    } else if (bl.kind === "entry") {
      ensure(30); y -= 2;
      const rw = bl.right ? reg.widthOfTextAtSize(safe(bl.right), 9.5) : 0;
      const tl = wrap(bl.title, bold, sz + 0.5, CW - rw - 12);
      tl.forEach((ln, k) => { ensure(15); text(ln, M, sz + 0.5, bold, ink); if (k === 0 && bl.right) text(safe(bl.right), W - M - rw, 9.5, reg, muted); y -= (sz + 0.5) * 1.38; });
      if (bl.sub) para(bl.sub, s.id === "executive" ? ital : s.id === "spotlight" ? bold : reg, sz - 0.5, s.id === "spotlight" ? accent : muted);
      y -= 2;
    } else if (bl.kind === "bullet") {
      const lines = wrap(bl.text, reg, sz, CW - 14);
      lines.forEach((ln, k) => {
        ensure(sz * 1.4);
        if (k === 0) text(DOT, M + 2, sz, bold, s.id === "executive" ? ink : accent);
        text(ln, M + 14, sz, reg, ink); y -= sz * 1.38;
      });
      y -= 1;
    } else if (bl.kind === "skills") {
      // Wrap items; separators are real "•" characters (accent coloured) so parsers keep skills apart.
      const dot = `  ${DOT}  `; const dotW = reg.widthOfTextAtSize(dot, sz);
      let x = M; ensure(sz * 1.4);
      bl.items.forEach((item, k) => {
        const it = safe(item); const w = reg.widthOfTextAtSize(it, sz);
        if (k > 0) {
          if (x + dotW + w > W - M) { text(",", x, sz, reg, ink); y -= sz * 1.38; ensure(sz * 1.4); x = M; }
          else { text(dot, x, sz, reg, s.id === "executive" ? muted : accent); x += dotW; }
        }
        text(it, x, sz, reg, ink); x += w;
      });
      y -= sz * 1.38;
    } else if (bl.kind === "gap") y -= 5;
    else para(bl.text, reg, sz, ink);
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false })); // classic xref for older parsers
}
