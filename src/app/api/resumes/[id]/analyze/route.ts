import { z } from "zod";
import { body, handler, HttpError } from "@/lib/api";
import { consentFor, ownResume } from "@/lib/resume/access";
import { analyzeAgainstJob, ruleSuggestions } from "@/lib/resume/analyze";
import { aiSuggestions } from "@/lib/resume/ai";
import { resumeDataSchema } from "@/lib/resume/types";
import { llmEnabled } from "@/lib/llm";
import { track } from "@/lib/usage";

export const POST = handler<{ id: string }>(async ({ req, user, params }) => {
  await ownResume(user.id, params.id);
  const { jobDescription, content, useAi } = await body(req, z.object({ jobDescription: z.string().min(40, "Paste the full job description").max(30000), content: resumeDataSchema, useAi: z.boolean().default(true) }));
  const analysis = analyzeAgainstJob(content, jobDescription);
  const rules = ruleSuggestions(content, analysis);
  let ai = { suggestions: [] as typeof rules, blocked: [] as { before: string; reason: string }[] }, aiStatus: "used" | "off" | "unconfigured" | "error" = "off";
  const consent = await consentFor(user.id);
  if (useAi && consent?.aiProcessing) {
    if (!llmEnabled()) aiStatus = "unconfigured";
    else { try { ai = await aiSuggestions(content, jobDescription, analysis); aiStatus = "used"; } catch (e) { console.error(e); aiStatus = "error"; } }
  }
  // AI suggestions take precedence over rule-based ones on the same target.
  const aiTargets = new Set(ai.suggestions.map((s) => s.target));
  const suggestions = [...ai.suggestions, ...rules.filter((r) => !aiTargets.has(r.target))];
  await track("resume_analyze");
  if (!analysis.jobKeywords.length && !analysis.requirements.length && !suggestions.length) throw new HttpError(422, "We couldn't find recognizable skills in that job description. Try pasting the full posting, including requirements.");
  return { analysis, suggestions, blocked: ai.blocked, aiStatus };
}, { auth: "user", limit: { key: "analyze", max: 30, windowMs: 60 * 60_000 } });
