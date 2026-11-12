import { promises as fs } from "fs";
import path from "path";
import { encryptBuffer, decryptBuffer, randomToken } from "./crypto";

/**
 * Object storage. All blobs are encrypted client-side (AES-256-GCM) BEFORE upload,
 * so even the storage provider never sees plaintext resumes.
 * Drivers: "local" (dev), "db" (Postgres; use on Vercel) and "supabase" (Supabase Storage private bucket via REST).
 */
interface Driver {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  del(key: string): Promise<void>;
}

const localDir = () => path.resolve(process.env.LOCAL_STORAGE_DIR ?? "./storage");

const local: Driver = {
  async put(key, data) {
    const p = path.join(localDir(), key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, data, { mode: 0o600 });
  },
  async get(key) { return fs.readFile(path.join(localDir(), key)); },
  async del(key) { await fs.rm(path.join(localDir(), key), { force: true }); },
};

function supabase(): Driver {
  const url = process.env.SUPABASE_URL, svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.STORAGE_BUCKET ?? "resumes";
  if (!url || !svc) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for supabase storage");
  const h = { Authorization: `Bearer ${svc}`, apikey: svc };
  const obj = (k: string) => `${url}/storage/v1/object/${bucket}/${k}`;
  return {
    async put(key, data) {
      const r = await fetch(obj(key), { method: "POST", headers: { ...h, "Content-Type": "application/octet-stream", "x-upsert": "true" }, body: new Uint8Array(data) });
      if (!r.ok) throw new Error(`storage put failed: ${r.status}`);
    },
    async get(key) {
      const r = await fetch(obj(key), { headers: h });
      if (!r.ok) throw new Error(`storage get failed: ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    },
    async del(key) {
      await fetch(`${url}/storage/v1/object/${bucket}`, { method: "DELETE", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [key] }) });
    },
  };
}

/** Stores the (already encrypted) blob in Postgres. Good for Vercel, where the filesystem doesn't persist. */
const database: Driver = {
  async put(key, data) {
    const { db, schema } = await import("@/db");
    await db.insert(schema.storedBlobs).values({ key, data }).onConflictDoUpdate({ target: schema.storedBlobs.key, set: { data } });
  },
  async get(key) {
    const { db, schema } = await import("@/db"); const { eq } = await import("drizzle-orm");
    const row = await db.query.storedBlobs.findFirst({ where: eq(schema.storedBlobs.key, key) });
    if (!row) throw new Error("stored file not found");
    return Buffer.from(row.data);
  },
  async del(key) {
    const { db, schema } = await import("@/db"); const { eq } = await import("drizzle-orm");
    await db.delete(schema.storedBlobs).where(eq(schema.storedBlobs.key, key));
  },
};

const driver = (): Driver => (process.env.STORAGE_DRIVER === "supabase" ? supabase() : process.env.STORAGE_DRIVER === "db" ? database : local);

export async function putEncrypted(userId: string, data: Buffer): Promise<string> {
  const key = `${userId}/${randomToken(16)}.bin`;
  await driver().put(key, encryptBuffer(data));
  return key;
}
export async function getDecrypted(key: string) { return decryptBuffer(await driver().get(key)); }
export async function deleteObject(key: string) { await driver().del(key); }
