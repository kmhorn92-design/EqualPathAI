import { z } from "zod";
import { body, handler } from "@/lib/api";
import { complete, llmEnabled } from "@/lib/llm";
import { guideAnswer, guidePrompt, uniqueLinks } from "@/lib/assistant";
import { searchGuide } from "@/content/site-guide";
import { track } from "@/lib/usage";

/** Stateless site-help assistant. Conversations are NOT stored. Works for signed-out visitors too. */
export const POST = handler(async ({ req }) => {
  const { messages } = await body(req, z.object({
    messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1500) })).min(1).max(12),
  }));
  const last = messages[messages.length - 1];
  await track("assistant_question");
  const fallback = guideAnswer(last.content);
  if (!llmEnabled()) return fallback;
  try {
    const answer = await complete(messages.slice(-8), { system: guidePrompt(), maxTokens: 400 });
    const links = uniqueLinks(searchGuide(last.content, 2).map((h) => h.link));
    return { answer: answer.trim() || fallback.answer, links: links.length ? links : fallback.links, source: "ai" as const };
  } catch {
    return fallback;
  }
}, { auth: "none", limit: { key: "assistant", max: 40, windowMs: 60 * 60_000 } });
