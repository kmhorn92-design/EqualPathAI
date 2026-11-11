import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler } from "@/lib/api";
import { encryptJson, encryptOpt } from "@/lib/crypto";
import { ownResume } from "@/lib/resume/access";
import { resumeDataSchema } from "@/lib/resume/types";
import { TEMPLATES } from "@/lib/resume/templates";
import { track } from "@/lib/usage";

const suggestionLog = z.array(z.object({ id: z.string(), kind: z.string(), target: z.string(), before: z.string().max(2000), after: z.string().max(2000), rationale: z.string().max(600), source: z.string(), status: z.enum(["pending", "accepted", "rejected"]) })).max(100);

/** Saves a version. Content is exactly what the user reviewed and approved in the editor. */
export const POST = handler<{ id: string }>(async ({ req, user, params }) => {
  const r = await ownResume(user.id, params.id);
  const input = await body(req, z.object({
    label: z.string().trim().min(1).max(120), templateId: z.enum(TEMPLATES.map((t) => t.id) as [string, ...string[]]).default("classic"),
    content: resumeDataSchema, jobTitle: z.string().max(200).optional().nullable(), jobDescription: z.string().max(30000).optional().nullable(),
    analysis: z.unknown().optional(), suggestions: suggestionLog.optional(),
  }));
  const [v] = await db.insert(schema.resumeVersions).values({
    resumeId: r.id, label: input.label, templateId: input.templateId, contentEnc: encryptJson(input.content), jobTitle: input.jobTitle ?? null,
    jobDescEnc: encryptOpt(input.jobDescription), analysisEnc: input.analysis || input.suggestions ? encryptJson({ analysis: input.analysis, suggestions: input.suggestions }) : null,
  }).returning({ id: schema.resumeVersions.id });
  await track("resume_version_saved");
  return { id: v.id };
});
