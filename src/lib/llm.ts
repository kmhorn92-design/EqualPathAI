import "server-only";

/**
 * Server-side LLM integration. Keys never leave the server.
 * LLM_PROVIDER = anthropic | openai | gemini | none (default: auto-detect from keys).
 */
export type Msg = { role: "user" | "assistant"; content: string };

export const SAFETY_SYSTEM = `You are EqualPath AI, a career-readiness assistant for job seekers, including women, racial and ethnic minorities, people in underserved communities, students, and career changers.
Hard rules:
- Never invent experience, employers, dates, degrees, certifications, metrics, or achievements. Only rephrase what the user provided. If something is missing, say so and suggest truthful options.
- Never promise ATS success or interview outcomes, and never produce an "ATS score". Explain that ATS implementations differ across employers.
- Never infer or ask about race, ethnicity, gender, age, religion, disability, national origin or other protected characteristics. Do not tailor advice based on a name.
- Do not help users cheat on live employer assessments; offer practice and preparation instead.
- You are not a lawyer. For discrimination concerns, give general educational information and point to EEOC (eeoc.gov) and the U.S. Department of Labor (dol.gov); never make legal determinations.
- For salary questions, explain you do not have live data; cite public sources the user can check (BLS Occupational Outlook Handbook bls.gov/ooh, O*NET onetonline.org, CareerOneStop careeronestop.org) and give ranges only with that caveat.
- Be warm, concise, practical, and use plain language.`;

export function llmProvider(): "anthropic" | "openai" | "gemini" | "none" {
  const p = process.env.LLM_PROVIDER;
  if (p === "anthropic" || p === "openai" || p === "gemini" || p === "none") return p;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}
export const llmEnabled = () => llmProvider() !== "none";

export async function complete(messages: Msg[], opts: { system?: string; maxTokens?: number; json?: boolean } = {}): Promise<string> {
  const provider = llmProvider();
  const system = [SAFETY_SYSTEM, opts.system].filter(Boolean).join("\n\n");
  const maxTokens = opts.maxTokens ?? 1200;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Number(process.env.LLM_TIMEOUT_MS ?? 45000));
  try {
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: ctrl.signal,
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: process.env.LLM_MODEL ?? "claude-sonnet-4-5", max_tokens: maxTokens, system, messages }),
      });
      if (!r.ok) throw new Error(`LLM error ${r.status}`);
      const j = (await r.json()) as { content: { type: string; text?: string }[] };
      return j.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    }
    if (provider === "openai") {
      const r = await fetch(`${process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`, {
        method: "POST", signal: ctrl.signal,
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.LLM_MODEL ?? "gpt-4o-mini", max_tokens: maxTokens,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
          messages: [{ role: "system", content: system }, ...messages],
        }),
      });
      if (!r.ok) throw new Error(`LLM error ${r.status}`);
      const j = (await r.json()) as { choices: { message: { content: string } }[] };
      return j.choices[0]?.message.content ?? "";
    }
    if (provider === "gemini") {
      const model = process.env.GEMINI_MODEL ?? (process.env.LLM_PROVIDER === "gemini" ? process.env.LLM_MODEL : undefined) ?? "gemini-3.6-flash";
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", signal: ctrl.signal,
        // Key goes in a header, never in the URL (URLs end up in logs).
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY!, "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          generationConfig: { maxOutputTokens: maxTokens, ...(opts.json ? { responseMimeType: "application/json" } : {}) },
        }),
      });
      if (!r.ok) throw new Error(`LLM error ${r.status}`);
      const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return (j.candidates?.[0]?.content?.parts ?? []).map((x) => x.text ?? "").join("");
    }
    throw new Error("LLM not configured");
  } finally { clearTimeout(t); }
}

/** Extracts the first JSON object/array from a model response. */
export function parseJsonLoose<T>(text: string): T | null {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = m ? m[1] : text.slice(Math.min(...[text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0)));
  try { return JSON.parse(raw) as T; } catch { return null; }
}
