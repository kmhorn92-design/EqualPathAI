import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { getModule } from "@/content/assessments";
import { gradeMcq, typingStats } from "@/lib/grading";
import { track } from "@/lib/usage";

const input = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mcq"), module: z.string(), answers: z.record(z.string(), z.number().int().min(-1).max(10)), durationSec: z.number().int().min(0).max(7200) }),
  z.object({ kind: z.literal("typing"), module: z.literal("typing"), passage: z.number().int().min(0).max(20), typed: z.string().max(5000), durationSec: z.number().int().min(1).max(3600) }),
  z.object({ kind: z.literal("interview"), module: z.literal("mock-interview"), answered: z.number().int().min(0).max(50), total: z.number().int().min(1).max(50), durationSec: z.number().int().min(0).max(7200) }),
]);

export const POST = handler(async ({ req, user }) => {
  const i = await body(req, input);
  const m = getModule(i.module);
  if (!m) throw new HttpError(404, "Unknown module");
  if (i.kind === "mcq") {
    if (m.kind !== "mcq" || !m.questions) throw new HttpError(400, "Not a multiple-choice module");
    const g = gradeMcq(m.questions, i.answers);
    await db.insert(schema.assessmentAttempts).values({ userId: user.id, module: m.id, score: g.score, total: g.total, durationSec: i.durationSec });
    await track(`assessment_${m.id}`);
    return g;
  }
  if (i.kind === "typing") {
    const target = m.passages?.[i.passage];
    if (!target) throw new HttpError(400, "Unknown passage");
    const s = typingStats(target, i.typed, i.durationSec);
    await db.insert(schema.assessmentAttempts).values({ userId: user.id, module: "typing", score: s.accuracy, total: 100, durationSec: i.durationSec, meta: s });
    return s;
  }
  await db.insert(schema.assessmentAttempts).values({ userId: user.id, module: "mock-interview", score: i.answered, total: i.total, durationSec: i.durationSec });
  return { ok: true };
});
