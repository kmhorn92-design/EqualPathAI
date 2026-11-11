import "server-only";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
} as const;

/** Detects type by magic bytes — never trusts the client-supplied MIME type alone. */
export function sniffType(buf: Buffer, name: string): "pdf" | "docx" | "txt" | null {
  if (buf.subarray(0, 5).toString() === "%PDF-") return "pdf";
  if (buf[0] === 0x50 && buf[1] === 0x4b && /\.docx$/i.test(name)) return "docx";
  if (/\.txt$/i.test(name)) {
    const sample = buf.subarray(0, 4096);
    if (!sample.includes(0)) return "txt";
  }
  return null;
}

export async function extractText(buf: Buffer, kind: "pdf" | "docx" | "txt"): Promise<string> {
  if (kind === "txt") return buf.toString("utf8");
  if (kind === "docx") {
    // HTML conversion preserves list structure, so bullets survive extraction.
    const mammoth = await import("mammoth");
    const { value } = await mammoth.convertToHtml({ buffer: buf });
    return value
      .replace(/<li[^>]*>/gi, "\n• ").replace(/<\/(p|li|h\d|tr)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  }
  // Modern pdf.js (via unpdf) handles PDF 1.5+ object streams produced by Word/Google Docs.
  const { getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(buf));
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 10); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let out = "", lastY: number | null = null;
    for (const it of content.items as { str?: string; hasEOL?: boolean; transform?: number[] }[]) {
      if (typeof it.str !== "string") continue;
      const y = it.transform?.[5] ?? null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && !out.endsWith("\n")) out += "\n";
      out += it.str + (it.hasEOL ? "\n" : "");
      if (y !== null) lastY = y;
    }
    pages.push(out);
  }
  return pages.join("\n");
}

