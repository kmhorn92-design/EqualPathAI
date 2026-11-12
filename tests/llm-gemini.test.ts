import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
describe("gemini", async () => {
  const { geminiThinking, complete, parseJsonLoose } = await import("@/lib/llm");
  it("keeps thinking light so answers aren't truncated", () => {
    expect(geminiThinking("gemini-3.6-flash")).toEqual({ thinkingConfig: { thinkingLevel: "low" } });
    expect(geminiThinking("gemini-2.5-flash")).toEqual({ thinkingConfig: { thinkingBudget: 0 } });
    expect(geminiThinking("gemini-1.5-flash")).toEqual({});
  });
  it("adds headroom, skips thought parts, and errors on empty replies", async () => {
    vi.stubEnv("LLM_PROVIDER", "gemini"); vi.stubEnv("GEMINI_API_KEY", "k"); vi.stubEnv("GEMINI_MODEL", "gemini-3.6-flash");
    let sent: any;
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: any) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "hmm", thought: true }, { text: "Full answer." }] } }] })); }));
    expect(await complete([{ role: "user", content: "hi" }], { maxTokens: 2000 })).toBe("Full answer.");
    expect(sent.generationConfig.maxOutputTokens).toBeGreaterThan(2000);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [] } }] }))));
    await expect(complete([{ role: "user", content: "hi" }])).rejects.toThrow(/no text/);
    vi.unstubAllEnvs();
  });
  it("parseJsonLoose returns null on non-JSON", () => { expect(parseJsonLoose("nope")).toBeNull(); });
});
