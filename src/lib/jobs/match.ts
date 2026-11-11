import { findKeywords, hasKeyword } from "../resume/lexicon";

/**
 * Skill-based, explainable match. Returns overlapping and missing keywords with plain-language
 * reasons. Deliberately NO probability/likelihood score — we can't know an employer's decision.
 */
export function explainMatch(jobText: string, userSkills: string[], resumeText: string, prefs: { workPreference?: string; location?: string | null }, job: { workMode: string; location: string }) {
  const jobKws = findKeywords(jobText);
  const mine = `${userSkills.join(", ")}\n${resumeText}`;
  const overlap = jobKws.filter((k) => hasKeyword(mine, k));
  const gaps = jobKws.filter((k) => !overlap.includes(k));
  const reasons: string[] = [];
  if (overlap.length) reasons.push(`Your profile/resume shows ${overlap.slice(0, 6).join(", ")}, which this posting mentions.`);
  if (prefs.workPreference && prefs.workPreference !== "UNKNOWN" && prefs.workPreference === job.workMode) reasons.push(`It matches your ${job.workMode.toLowerCase()} work preference.`);
  if (prefs.location && job.location.toLowerCase().includes(prefs.location.split(",")[0].toLowerCase())) reasons.push(`It's in your preferred area (${prefs.location}).`);
  if (gaps.length) reasons.push(`The posting also mentions ${gaps.slice(0, 5).join(", ")}, which we didn't find in your materials. Add them only if they're true.`);
  if (!jobKws.length) reasons.push("We couldn't identify specific skills in this posting. Read the full description on the employer's site.");
  return { overlap, gaps, reasons, disclaimer: "This compares skills only. It is not a prediction of whether you'll be hired." };
}
