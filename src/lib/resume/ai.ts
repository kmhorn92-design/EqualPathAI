import "server-only";
import { complete, llmEnabled, parseJsonLoose } from "../llm";
import { resumeDataSchema, type KeywordAnalysis, type ResumeData, type Suggestion } from "./types";
import { guardSuggestion } from "./analyze";
import { resumeCorpus } from "./parse";

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** True if most of the bullet's words occur in the source text (grounding check). */
export function grounded(text: string, raw: string) {
  const words = normalize(text).split(" ").filter((w) => w.length > 2);
  if (!words.length) return false;
  const src = new Set(normalize(raw).split(" "));
  return words.filter((w) => src.has(w)).length / words.length >= 0.85;
}

/** Optional AI structuring. Output is filtered so only text grounded in the original survives. */
export async function aiStructure(raw: string, fallback: ResumeData): Promise<ResumeData> {
  if (!llmEnabled()) return fallback;
  try {
    const out = await complete([{ role: "user", content: `Extract this resume into JSON matching:
{"contact":{"name","email","phone","location","links":[]},"summary":"","experience":[{"id":"exp1","title","company","location","start","end","bullets":[]}],"education":[{"id":"edu1","school","degree","field","end","details"}],"skills":[],"certifications":[],"projects":[{"id":"prj1","name","description"}]}
Copy text VERBATIM from the resume. Do not add, infer, or improve anything. Return only JSON.

RESUME:
"""${raw.slice(0, 14000)}"""` }], { maxTokens: 6000, json: true });
    const parsed = resumeDataSchema.safeParse(parseJsonLoose(out));
    if (!parsed.success) return fallback;
    const r = parsed.data;
    r.experience = r.experience.map((e, i) => ({ ...e, id: `exp_${i}_${Date.now().toString(36)}`, bullets: e.bullets.filter((b) => grounded(b, raw)) }));
    r.education = r.education.map((e, i) => ({ ...e, id: `edu_${i}_${Date.now().toString(36)}` }));
    r.projects = r.projects.map((p, i) => ({ ...p, id: `prj_${i}_${Date.now().toString(36)}` }));
    r.skills = r.skills.filter((s) => grounded(s, raw));
    if (r.summary && !grounded(r.summary, raw)) r.summary = fallback.summary;
    return r;
  } catch { return fallback; }
}

/** AI rewrite suggestions; every one passes through the anti-fabrication guard. */
export async function aiSuggestions(resume: ResumeData, jd: string, analysis: KeywordAnalysis): Promise<{ suggestions: Suggestion[]; blocked: { before: string; reason: string }[] }> {
  if (!llmEnabled()) return { suggestions: [], blocked: [] };
  const bullets = resume.experience.flatMap((e) => e.bullets.map((b, i) => ({ target: `${e.id}:${i}`, role: `${e.title} @ ${e.company}`, text: b })));
  if (!bullets.length && !resume.summary) return { suggestions: [], blocked: [] };
  const out = await complete([{ role: "user", content: `Improve clarity of these resume bullets for the job below. Rules: keep every fact identical; do NOT add numbers, tools, skills, employers, or achievements that are not in the original bullet or elsewhere in the resume; start with a strong action verb; you may reorder words to surface keywords the candidate ALREADY demonstrates (${analysis.matched.join(", ") || "none"}). Skip bullets that are already strong. Return JSON: {"items":[{"target":"...","after":"...","rationale":"one sentence"}], "summary": {"after":"...","rationale":"..."} | null}. Max 8 items.

JOB DESCRIPTION:
"""${jd.slice(0, 6000)}"""

CURRENT SUMMARY: ${resume.summary || "(none)"}
BULLETS: ${JSON.stringify(bullets).slice(0, 9000)}` }], { maxTokens: 3000, json: true });
  const parsed = parseJsonLoose<{ items?: { target: string; after: string; rationale: string }[]; summary?: { after: string; rationale: string } | null }>(out);
  if (!parsed) throw new Error("AI returned unreadable suggestions");
  const corpus = resumeCorpus(resume);
  const suggestions: Suggestion[] = []; const blocked: { before: string; reason: string }[] = [];
  let n = 0; const id = () => `ai_${Date.now().toString(36)}${n++}`;
  for (const it of parsed?.items ?? []) {
    const src = bullets.find((b) => b.target === it.target);
    if (!src || !it.after || it.after.trim() === src.text.trim()) continue;
    const g = guardSuggestion(src.text, it.after, corpus);
    if (!g.ok) { blocked.push({ before: src.text, reason: g.reason! }); continue; }
    suggestions.push({ id: id(), kind: "bullet", target: it.target, before: src.text, after: it.after.trim().slice(0, 600), rationale: String(it.rationale ?? "").slice(0, 300), source: "ai", status: "pending" });
  }
  if (parsed?.summary?.after && resume.summary) {
    const g = guardSuggestion(resume.summary, parsed.summary.after, corpus);
    if (g.ok) suggestions.push({ id: id(), kind: "summary", target: "summary", before: resume.summary, after: parsed.summary.after.slice(0, 1500), rationale: String(parsed.summary.rationale ?? ""), source: "ai", status: "pending" });
    else blocked.push({ before: "Summary", reason: g.reason! });
  }
  return { suggestions, blocked };
}
