import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

/**
 * AES-256-GCM field/blob encryption for data at rest.
 * Format (string): v1:<iv b64>:<tag b64>:<ciphertext b64>
 * Key: 32 random bytes, base64, in ENCRYPTION_KEY. Rotate by adding ENCRYPTION_KEY_PREVIOUS.
 */
function key(name = "ENCRYPTION_KEY"): Buffer | null {
  const raw = process.env[name];
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error(`${name} must be 32 bytes base64 (run: npm run keygen)`);
  return buf;
}
function primaryKey(): Buffer {
  const k = key();
  if (!k) throw new Error("ENCRYPTION_KEY is not set (run: npm run keygen)");
  return k;
}

export function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", primaryKey(), iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from("EP1"), iv, cipher.getAuthTag(), ct]);
}

export function decryptBuffer(blob: Buffer): Buffer {
  if (blob.subarray(0, 3).toString() !== "EP1") throw new Error("Unknown blob format");
  const iv = blob.subarray(3, 15), tag = blob.subarray(15, 31), ct = blob.subarray(31);
  for (const k of [primaryKey(), key("ENCRYPTION_KEY_PREVIOUS")].filter(Boolean) as Buffer[]) {
    try {
      const d = createDecipheriv("aes-256-gcm", k, iv);
      d.setAuthTag(tag);
      return Buffer.concat([d.update(ct), d.final()]);
    } catch { /* try next key */ }
  }
  throw new Error("Decryption failed");
}

export function encrypt(text: string): string {
  const b = encryptBuffer(Buffer.from(text, "utf8"));
  const iv = b.subarray(3, 15), tag = b.subarray(15, 31), ct = b.subarray(31);
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decrypt(payload: string): string {
  const [v, iv, tag, ct] = payload.split(":");
  if (v !== "v1" || !iv || !tag || ct === undefined) throw new Error("Bad ciphertext");
  const blob = Buffer.concat([Buffer.from("EP1"), Buffer.from(iv, "base64"), Buffer.from(tag, "base64"), Buffer.from(ct, "base64")]);
  return decryptBuffer(blob).toString("utf8");
}

export const encryptJson = (v: unknown) => encrypt(JSON.stringify(v));
export const decryptJson = <T>(p: string): T => JSON.parse(decrypt(p)) as T;
export const encryptOpt = (s?: string | null) => (s ? encrypt(s) : null);
export const decryptOpt = (s?: string | null) => (s ? decrypt(s) : null);

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
