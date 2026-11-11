import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { handler, HttpError } from "@/lib/api";
import { encryptJson } from "@/lib/crypto";
import { putEncrypted } from "@/lib/storage";
import { structureText } from "@/lib/resume/parse";
import { extractText, MAX_UPLOAD_BYTES, sniffType } from "@/lib/resume/extract";
import { aiStructure } from "@/lib/resume/ai";
import { consentFor } from "@/lib/resume/access";
import { track } from "@/lib/usage";

export const runtime = "nodejs";

export const GET = handler(async ({ user }) => {
  const rows = await db.select({ id: schema.resumes.id, title: schema.resumes.title, originalName: schema.resumes.originalName, createdAt: schema.resumes.createdAt, updatedAt: schema.resumes.updatedAt })
    .from(schema.resumes).where(eq(schema.resumes.userId, user.id)).orderBy(desc(schema.resumes.updatedAt));
  return { items: rows };
});

/** Upload (multipart "file") or paste ({ text }). Parses, encrypts, stores. */
export const POST = handler(async ({ req, user }) => {
  const ct = req.headers.get("content-type") ?? "";
  let raw = "", originalName: string | null = null, mime: string | null = null, storageKey: string | null = null, title = "My resume";
  if (ct.startsWith("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file uploaded");
    if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "File is larger than 5 MB");
    if (file.size === 0) throw new HttpError(400, "File is empty");
    const buf = Buffer.from(await file.arrayBuffer());
    const kind = sniffType(buf, file.name);
    if (!kind) throw new HttpError(415, "Please upload a PDF, DOCX, or TXT file");
    try { raw = await extractText(buf, kind); } catch { throw new HttpError(422, "We couldn't read that file. If it's a scanned image, try a DOCX or paste the text instead."); }
    originalName = file.name.slice(0, 200); mime = file.type || kind;
    storageKey = await putEncrypted(user.id, buf);
    title = file.name.replace(/\.(pdf|docx|txt)$/i, "").slice(0, 120) || title;
  } else {
    const { text, title: t } = z.object({ text: z.string().min(30, "Paste at least a few lines").max(60000), title: z.string().max(120).optional() }).parse(await req.json());
    raw = text; title = t || title;
  }
  if (raw.trim().length < 30) throw new HttpError(422, "We found very little text. If this is a scanned PDF, try a DOCX or paste your resume text.");
  const consent = await consentFor(user.id);
  const heuristic = structureText(raw);
  const parsed = consent?.aiProcessing ? await aiStructure(raw, heuristic) : heuristic;
  const [r] = await db.insert(schema.resumes).values({ userId: user.id, title, originalName, mimeType: mime, storageKey, parsedEnc: encryptJson(parsed) }).returning({ id: schema.resumes.id });
  await db.insert(schema.resumeVersions).values({ resumeId: r.id, label: "Original (as uploaded)", contentEnc: encryptJson(parsed) });
  await track("resume_upload");
  return { id: r.id };
});
