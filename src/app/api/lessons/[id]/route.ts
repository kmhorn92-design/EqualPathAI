import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { getLesson } from "@/content/lessons";
import { track } from "@/lib/usage";

export const POST = handler<{ id: string }>(async ({ req, user, params }) => {
  const l = getLesson(params.id);
  if (!l) throw new HttpError(404, "Lesson not found");
  const { answers } = await body(req, z.object({ answers: z.array(z.number().int().min(-1).max(10)).max(20) }));
  const results = l.quiz.map((q, i) => ({ ok: answers[i] === q.answer, correct: q.answer, why: q.why }));
  const score = results.filter((r) => r.ok).length;
  const completed = score >= Math.ceil(l.quiz.length * 0.66);
  await db.insert(schema.lessonProgress).values({ userId: user.id, lessonId: l.id, completed, quizScore: score })
    .onConflictDoUpdate({ target: [schema.lessonProgress.userId, schema.lessonProgress.lessonId], set: { completed, quizScore: score } });
  if (completed) await track("lesson_completed");
  return { score, total: l.quiz.length, completed, results };
});
