import { findKeywords, hasKeyword } from "./lexicon";
import { resumeCorpus } from "./parse";
import type { KeywordAnalysis, ResumeData, Suggestion } from "./types";

const REQ_LINE = /(required|requirement|must|minimum|at least|\d\+?\s*years?|certif|licen[cs]e|degree|diploma|proficien|experience (with|in)|ability to|able to|knowledge of|familiar|skills? (in|with)|preferred|qualif)/i;
const REQ_HEAD = /^(requirements?|qualifications?|what you('|’)ll need|what we('|’)re looking for|who you are|must[- ]haves?|skills|preferred|nice to have|minimum qualifications|basic qualifications)\b/i;
const STOP = new Set("a an and are as at be by can for from has have in into is it its of on or our such that the their this to was we will with you your who what able ability must required preferred plus strong excellent good work working years year experience knowledge skills skill including etc other related equivalent per using use".split(" "));
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").split(" ").map((w) => w.replace(/\.+$/, "")).filter((w) => w.length > 2 && !STOP.has(w));
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");

/** Requirement lines: those that read like requirements, plus bullets under a "Requirements" style heading. */
export function requirementLines(jd: string): string[] {
  const out: string[] = []; let inReq = false;
  for (const rawLine of jd.split(/\n/)) {
    const line = rawLine.replace(/^[\s•*\-–·]+/, "").trim();
    if (!line) continue;
    if (line.length < 60 && REQ_HEAD.test(line.replace(/[:#]/g, "").trim())) { inReq = true; continue; }
    if (line.length < 40 && /:$/.test(line)) { inReq = false; continue; }
    for (const sent of line.split(/(?<=\.)\s+/)) {
      const t = sent.trim();
      if (t.length > 12 && t.length < 300 && (inReq || REQ_LINE.test(t))) out.push(t);
    }
  }
  return [...new Set(out)].slice(0, 20);
}

/** Literal evidence: a lexicon keyword, or most of the requirement's content words appear in the resume. */
export function evidenceFor(text: string, corpus: string): string | null {
  const kws = findKeywords(text);
  const found = kws.find((k) => hasKeyword(corpus, k));
  if (found) return found;
  const req = [...new Set(words(text).filter((w) => !/^\d+$/.test(w)))];
  if (req.length < 2) return null;
  const have = new Set(words(corpus).map(stem));
  const hits = req.filter((w) => have.has(stem(w)));
  return hits.length >= 2 && hits.length / req.length >= 0.5 ? hits.slice(0, 4).join(", ") : null;
}

/** Transparent keyword comparison. Produces counts and evidence — NOT an ATS score. */
export function analyzeAgainstJob(resume: ResumeData, jobDescription: string): KeywordAnalysis {
  const corpus = resumeCorpus(resume);
  const jobKeywords = findKeywords(jobDescription);
  const matched = jobKeywords.filter((k) => hasKeyword(corpus, k));
  const missing = jobKeywords.filter((k) => !matched.includes(k));

  const requirements = requirementLines(jobDescription).map((text) => {
    const found = evidenceFor(text, corpus);
    const yrs = text.match(/(\d+)\+?\s*years?/i);
    if (found) return { text, status: "evidenced" as const, evidence: `Your resume mentions: ${found}${yrs ? " — confirm you meet the years requirement" : ""}.` };
    return { text, status: "not-found" as const };
  });

  return {
    jobKeywords, matched, missing, requirements,
    coverage: { matched: matched.length, total: jobKeywords.length },
    notes: [
      "This is a literal keyword comparison, not an ATS score. Every employer configures their applicant tracking system differently, and many rely on human reviewers.",
      "Only add a missing keyword if it truthfully describes your experience. If you lack a qualification, consider learning it, or address it honestly in a cover letter.",
    ],
  };
}

const WEAK_OPENERS: [RegExp, string][] = [
  [/^responsible for (managing|leading)\s+/i, "Managed "],
  [/^responsible for (training)\s+/i, "Trained "],
  [/^responsible for (handling)\s+/i, "Handled "],
  [/^responsible for (creating|developing)\s+/i, "Developed "],
  [/^(helped|assisted) (with|in)\s+/i, "Supported "],
  [/^worked on\s+/i, "Contributed to "],
  [/^duties included\s+/i, ""],
  [/^in charge of\s+/i, "Oversaw "],
  [/^tasked with\s+/i, ""],
];

const IRREGULAR: Record<string, string> = { leading: "Led", running: "Ran", building: "Built", writing: "Wrote", teaching: "Taught", making: "Made", setting: "Set", keeping: "Kept", selling: "Sold", overseeing: "Oversaw", driving: "Drove", taking: "Took", giving: "Gave", bringing: "Brought", meeting: "Met", holding: "Held", speaking: "Spoke", choosing: "Chose", getting: "Got", paying: "Paid", sending: "Sent", spending: "Spent", understanding: "Understood", buying: "Bought", seeing: "Saw" };
/** "scheduling" → "Scheduled", "planning" → "Planned"; irregular verbs via lookup. */
export function pastTense(gerund: string): string | null {
  const g = gerund.toLowerCase();
  if (IRREGULAR[g]) return IRREGULAR[g];
  if (!g.endsWith("ing") || g.length < 6) return null;
  const stem = g.slice(0, -3);
  const word = /([bcdfghjklmnpqrstvwxz])\1$/.test(stem) && !/(ss|ll|ff|zz)$/.test(stem) ? `${stem}ed` : /e$/.test(stem) ? `${stem}d` : /[^aeiou]y$/.test(stem) ? `${stem.slice(0, -1)}ied` : `${stem}ed`;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

let s = 0;
const sid = () => `sg_${Date.now().toString(36)}${(s++).toString(36)}`;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Rule-based suggestions that only rephrase or reorganize existing content. */
export function ruleSuggestions(resume: ResumeData, analysis: KeywordAnalysis): Suggestion[] {
  const out: Suggestion[] = [];
  for (const exp of resume.experience) {
    exp.bullets.forEach((b, i) => {
      let after = b.trim();
      let matched = false;
      for (const [re, rep] of WEAK_OPENERS) if (re.test(after)) { after = cap(after.replace(re, rep)); matched = true; break; }
      const gm = !matched && after.match(/^(?:responsible for|in charge of)\s+([a-z]+ing)\s+/i);
      if (gm) { const v = pastTense(gm[1]); if (v) after = after.replace(gm[0], `${v} `); }
      after = after.replace(/\s{2,}/g, " ").replace(/\.$/, "");
      if (after !== b.trim().replace(/\.$/, "") && after.length > 3) {
        out.push({ id: sid(), kind: "bullet", target: `${exp.id}:${i}`, before: b, after, rationale: "Starts with a direct action verb instead of a passive phrase. Meaning unchanged.", source: "rules", status: "pending" });
      }
    });
  }
  // Skills that are evidenced elsewhere in the resume but not listed in the Skills section.
  const listed = resume.skills.join(", ");
  const toAdd = analysis.matched.filter((k) => !hasKeyword(listed, k));
  if (toAdd.length) {
    out.push({
      id: sid(), kind: "skill", target: "skills", before: resume.skills.join(", "), after: [...resume.skills, ...toAdd].join(", "),
      rationale: `These job keywords already appear in your experience but not your Skills list: ${toAdd.join(", ")}. Listing them helps both people and software find them.`,
      source: "rules", status: "pending",
    });
  }
  return out;
}

/**
 * Anti-fabrication guard for AI suggestions. Rejects rewrites that introduce
 * numbers/metrics or skill keywords that are not already present in the resume.
 */
export function guardSuggestion(before: string, after: string, corpus: string): { ok: boolean; reason?: string } {
  const nums = (t: string) => new Set((t.match(/\d+(?:[.,]\d+)?%?/g) ?? []).map((x) => x.replace(/,/g, "")));
  const bn = nums(corpus + " " + before);
  for (const x of nums(after)) if (!bn.has(x)) return { ok: false, reason: `introduces a number (${x}) not found in your resume` };
  const known = new Set(findKeywords(corpus + " " + before));
  for (const k of findKeywords(after)) if (!known.has(k)) return { ok: false, reason: `introduces a skill (${k}) not evidenced in your resume` };
  if (after.length > Math.max(before.length * 2.2, 220)) return { ok: false, reason: "expands the content too much" };
  return { ok: true };
}

/** Apply only accepted suggestions to produce the new version. */
export function applySuggestions(resume: ResumeData, suggestions: Suggestion[]): ResumeData {
  const next: ResumeData = structuredClone(resume);
  for (const sg of suggestions.filter((x) => x.status === "accepted")) {
    if (sg.kind === "summary") next.summary = sg.after;
    else if (sg.kind === "skill") next.skills = Array.from(new Set(sg.after.split(",").map((x) => x.trim()).filter(Boolean)));
    else {
      const [expId, idx] = sg.target.split(":");
      const exp = next.experience.find((e) => e.id === expId);
      if (exp && exp.bullets[Number(idx)] !== undefined) exp.bullets[Number(idx)] = sg.after;
    }
  }
  return next;
}
