import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { randomToken, sha256 } from "./crypto";

const COOKIE = "ep_session";
const TTL_DAYS = 14;

export type SessionUser = { id: string; email: string; name: string | null; role: "USER" | "ADMIN"; onboardedAt: Date | null };

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 864e5);
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await db.insert(schema.sessions).values({ tokenHash: sha256(token), userId, expiresAt, userAgent: ua });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)));
  jar.delete(COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role, onboardedAt: schema.users.onboardedAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

/** For pages: redirects unauthenticated users to login, un-onboarded users to onboarding. */
export async function requirePageUser(opts: { allowUnonboarded?: boolean } = {}) {
  const u = await getUser();
  if (!u) redirect("/login");
  if (!u.onboardedAt && !opts.allowUnonboarded) redirect("/onboarding");
  return u;
}

export async function requirePageAdmin() {
  const u = await requirePageUser();
  if (u.role !== "ADMIN") redirect("/dashboard");
  return u;
}
