import { handler, HttpError } from "@/lib/api";
import { decryptJson } from "@/lib/crypto";
import { ownVersion } from "@/lib/resume/access";
import { exportDocx, exportPdf } from "@/lib/resume/export";
import type { ResumeData } from "@/lib/resume/types";
import { track } from "@/lib/usage";

export const runtime = "nodejs";
export const GET = handler<{ id: string }>(async ({ req, user, params }) => {
  const v = await ownVersion(user.id, params.id);
  const format = req.nextUrl.searchParams.get("format");
  const template = req.nextUrl.searchParams.get("template") ?? v.templateId;
  if (format !== "docx" && format !== "pdf") throw new HttpError(400, "format must be docx or pdf");
  const data = decryptJson<ResumeData>(v.contentEnc);
  const style = req.nextUrl.searchParams.get("style") ?? undefined;
  const buf = format === "docx" ? await exportDocx(data, template, style) : await exportPdf(data, template, style);
  const name = `${(data.contact.name || "resume").replace(/[^A-Za-z0-9]+/g, "_")}_${v.label.replace(/[^A-Za-z0-9]+/g, "_")}`.slice(0, 80);
  await track(`export_${format}`);
  return new Response(new Uint8Array(buf), { headers: {
    "Content-Type": format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
    "Content-Disposition": `attachment; filename="${name}.${format}"`, "Cache-Control": "no-store",
  } });
});
