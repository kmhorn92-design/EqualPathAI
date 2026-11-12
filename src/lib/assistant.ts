import { SITE_GUIDE, searchGuide, type GuideEntry } from "@/content/site-guide";

export function uniqueLinks(ls: ({ href: string; label: string } | undefined)[]) {
  const seen = new Set<string>(); const out: { href: string; label: string }[] = [];
  for (const l of ls) if (l && !seen.has(l.href)) { seen.add(l.href); out.push(l); }
  return out;
}

export type AssistantReply = { answer: string; links: { href: string; label: string }[]; source: "ai" | "guide" };

const FALLBACK_NONE = "I'm not sure about that one. I can answer questions about using EqualPath: resumes, the job board, coaches, hiring partners, practice tests, lessons, and privacy. Try rephrasing, or pick a suggested question.";

/** Deterministic answer straight from the help guide (used without an LLM, in the demo, and on LLM failure). */
export function guideAnswer(question: string): AssistantReply {
  const hits = searchGuide(question, 2);
  if (!hits.length) return { answer: FALLBACK_NONE, links: [{ href: "/", label: "Home" }], source: "guide" };
  const [top, second] = hits;
  const answer = second && second.score >= top.score - 1 ? `${top.a}\n\nRelated: ${second.a}` : top.a;
  return { answer, links: uniqueLinks(hits.map((h) => h.link)), source: "guide" };
}

export function guidePrompt(entries: GuideEntry[] = SITE_GUIDE) {
  return `You are the EqualPath AI site assistant. Answer questions about using the EqualPath website.
Rules:
- Use ONLY the help guide below for facts about EqualPath. If the guide doesn't cover it, say you're not sure and point to the closest page. Never invent features, prices, partners, people, or policies.
- Keep answers short (2–5 sentences), friendly, plain language. Mention the relevant page by name.
- For personal career advice, suggest the AI Career Coach or a human coach. For legal questions, point to the Fair Hiring Center; you can't give legal advice.
- Never ask for or comment on race, gender, age, disability, or other protected characteristics.
HELP GUIDE:
${entries.map((e) => `Q: ${e.q}\nA: ${e.a}${e.link ? ` [Page: ${e.link.label} → ${e.link.href}]` : ""}`).join("\n\n")}`;
}
