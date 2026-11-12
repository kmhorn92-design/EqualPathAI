export async function getJson<T>(url: string, init: RequestInit & { signal: AbortSignal }): Promise<T> {
  const r = await fetch(url, { ...init, headers: { Accept: "application/json", "User-Agent": "EqualPathAI-JobIngest/1.0", ...(init.headers ?? {}) } });
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status} from ${new URL(url).host}`), { status: r.status });
  return (await r.json()) as T;
}
export const list = (v?: string) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Reads a setting, ignoring accidental surrounding quotes/spaces (a common copy-paste slip in hosting dashboards). */
export const envVal = (name: string) => (process.env[name] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
