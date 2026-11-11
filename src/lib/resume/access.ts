import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { HttpError } from "../api";

export async function ownResume(userId: string, id: string) {
  const r = await db.query.resumes.findFirst({ where: and(eq(schema.resumes.id, id), eq(schema.resumes.userId, userId)) });
  if (!r) throw new HttpError(404, "Resume not found");
  return r;
}
export async function ownVersion(userId: string, id: string) {
  const [row] = await db.select({ v: schema.resumeVersions, userId: schema.resumes.userId }).from(schema.resumeVersions)
    .innerJoin(schema.resumes, eq(schema.resumes.id, schema.resumeVersions.resumeId)).where(eq(schema.resumeVersions.id, id)).limit(1);
  if (!row || row.userId !== userId) throw new HttpError(404, "Version not found");
  return row.v;
}
export async function consentFor(userId: string) {
  return db.query.consents.findFirst({ where: eq(schema.consents.userId, userId) });
}
