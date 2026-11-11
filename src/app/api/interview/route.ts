import { z } from "zod";
import { body, handler } from "@/lib/api";
import { starCheck } from "@/lib/grading";
import { complete, llmEnabled } from "@/lib/llm";
import { consentFor } from "@/lib/resume/access";

export const POST = handler(async ({ req, user }) => {
  const { question, answer } = await body(req, z.object({ question: z.string().max(500), answer: z.string().min(10, "Write or dictate a bit more").max(6000) }));
  const star = starCheck(answer);
  let ai: string | null = null;
  const consent = await consentFor(user.id);
  if (llmEnabled() && consent?.aiProcessing) {
    try {
      ai = await complete([{ role: "user", content: `Interview practice. Question: "${question}"\nCandidate's answer: """${answer}"""\n\nGive concise coaching (under 180 words): 1) what works, 2) STAR structure gaps, 3) one improved opening sentence that uses ONLY facts in their answer. Do not invent details or metrics. Do not predict hiring outcomes.` }], { maxTokens: 500 });
    } catch { ai = null; }
  }
  return { star, ai };
}, { auth: "user", limit: { key: "interview", max: 60, windowMs: 60 * 60_000 } });
