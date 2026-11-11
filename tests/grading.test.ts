import { describe, it, expect } from "vitest";
import { gradeMcq, typingStats, starCheck } from "@/lib/grading";
import { MODULES } from "@/content/assessments";
import { LESSONS } from "@/content/lessons";
import { TEMPLATES } from "@/lib/resume/templates";

describe("assessments", () => {
  it("grades server-side", () => {
    const qs = MODULES.find((m) => m.id === "numerical")!.questions!;
    const all = Object.fromEntries(qs.map((q) => [q.id, q.answer]));
    expect(gradeMcq(qs, all).score).toBe(qs.length);
    expect(gradeMcq(qs, {}).score).toBe(0);
  });
  it("every MCQ has a valid answer index and an explanation", () => {
    for (const m of MODULES) for (const q of m.questions ?? []) { expect(q.answer).toBeLessThan(q.options.length); expect(q.why.length).toBeGreaterThan(5); }
    for (const l of LESSONS) for (const q of l.quiz) expect(q.answer).toBeLessThan(q.options.length);
  });
  it("computes typing WPM and accuracy", () => {
    const s = typingStats("hello world", "hello world", 6);
    expect(s.accuracy).toBe(100); expect(s.wpm).toBe(22);
    expect(typingStats("abcd", "abxx", 60).accuracy).toBe(50);
  });
  it("STAR check flags missing parts", () => {
    const r = starCheck("We did a project.");
    expect(r.parts.result).toBe(false);
    expect(r.tips.length).toBeGreaterThan(1);
    const good = starCheck("At my last job a customer was upset about a late order. My job was to resolve it. I listened, apologized, and I called the warehouse to expedite. As a result the customer stayed and I learned to escalate earlier.");
    expect(Object.values(good.parts).every(Boolean)).toBe(true);
  });
});

describe("templates", () => {
  it("covers every required industry", () => {
    const need = ["Healthcare", "Technology", "Customer Service", "Administration", "Finance", "Education", "Logistics", "Creative", "Hospitality", "Government", "Entry-Level"];
    for (const n of need) expect(TEMPLATES.some((t) => t.industry === n)).toBe(true);
  });
});
