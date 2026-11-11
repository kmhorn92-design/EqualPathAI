import type { MCQ } from "@/content/assessments";

/** Server-side grading — the client never sees which answer is correct until it submits. */
export function gradeMcq(questions: MCQ[], answers: Record<string, number>) {
  const results = questions.map((q) => ({ id: q.id, chosen: answers[q.id] ?? -1, correct: q.answer, ok: answers[q.id] === q.answer, why: q.why }));
  return { score: results.filter((r) => r.ok).length, total: questions.length, results };
}

/** Typing: words per minute (5 chars = 1 word) and character accuracy. */
export function typingStats(target: string, typed: string, seconds: number) {
  let correct = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) correct++;
  const minutes = Math.max(seconds, 1) / 60;
  const wpm = Math.round(correct / 5 / minutes);
  const accuracy = typed.length ? Math.round((correct / Math.max(typed.length, 1)) * 100) : 0;
  return { wpm, accuracy };
}

/** Transparent STAR heuristic used when no LLM is configured (or as a supplement). */
export function starCheck(answer: string) {
  const a = answer.toLowerCase();
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const parts = {
    situation: /\b(when|while|at my|in my (last|previous|role)|there was|our team|the company|a customer)\b/.test(a),
    task: /\b(my (job|role|task|responsibility|goal) was|i needed to|i was asked|i had to|responsible for)\b/.test(a),
    action: /\b(i (decided|created|organized|called|spoke|trained|built|scheduled|listened|asked|reached|developed|led|fixed|resolved|set up|worked))\b/.test(a),
    result: /\b(as a result|result(ed)?|outcome|which led|so that|ended up|improv|reduc|increas|saved|learned)\b/.test(a),
  };
  const tips: string[] = [];
  if (!parts.situation) tips.push("Open with a brief Situation: where you were and what was happening.");
  if (!parts.task) tips.push("Name your Task: what you were responsible for.");
  if (!parts.action) tips.push("Describe Actions in the first person (\"I…\"), meaning the specific steps you took.");
  if (!parts.result) tips.push("End with the Result: what changed, and what you learned. Use real numbers only if you know them.");
  if (words < 60) tips.push("Your answer is short. Aim for roughly 1–2 minutes spoken (about 150–300 words).");
  if (words > 400) tips.push("Your answer is long. Trim background and focus on your actions and the result.");
  const we = (a.match(/\bwe\b/g) ?? []).length, i = (a.match(/\bi\b/g) ?? []).length;
  if (we > i && we > 2) tips.push("You use \"we\" more than \"I\". Make your own contribution clear.");
  return { parts, words, tips };
}
