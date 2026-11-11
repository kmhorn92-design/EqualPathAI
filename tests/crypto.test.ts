import { describe, it, expect } from "vitest";
import { encrypt, decrypt, encryptBuffer, decryptBuffer, encryptJson, decryptJson } from "@/lib/crypto";

describe("AES-256-GCM encryption", () => {
  it("round-trips strings, JSON and buffers", () => {
    expect(decrypt(encrypt("résumé ✓"))).toBe("résumé ✓");
    expect(decryptJson<{ a: number[] }>(encryptJson({ a: [1, 2] }))).toEqual({ a: [1, 2] });
    const b = Buffer.from([0, 1, 2, 255]);
    expect(decryptBuffer(encryptBuffer(b)).equals(b)).toBe(true);
  });
  it("uses a fresh IV each time (no deterministic ciphertext)", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });
  it("detects tampering", () => {
    const c = encrypt("secret").split(":");
    c[3] = Buffer.from("tampered").toString("base64");
    expect(() => decrypt(c.join(":"))).toThrow();
  });
});
