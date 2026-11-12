import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { body, handler, HttpError } from "@/lib/api";
import { decrypt, encrypt } from "@/lib/crypto";
import { complete, llmEnabled } from "@/lib/llm";
import { fallbackReply, TOPICS, type Topic } from "@/lib/coach";
import { consentFor } from "@/lib/resume/access";
import { track } from "@/lib/usage";

export const GET = handler(async ({ req, user }) => {
  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) return { threads: await db.select().from(schema.chatThreads).where(eq(schema.chatThreads.userId, user.id)).orderBy(desc(schema.chatThreads.updatedAt)).limit(30) };
  const t = await db.query.chatThreads.findFirst({ where: and(eq(schema.chatThreads.id, threadId), eq(schema.chatThreads.userId, user.id)) });
  if (!t) throw new HttpError(404, "Conversation not found");
  const msgs = await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.threadId, t.id)).orderBy(asc(schema.chatMessages.createdAt));
  return { thread: t, messages: msgs.map((m) => ({ id: m.id, role: m.role, content: decrypt(m.contentEnc), createdAt: m.createdAt })) };
});

export const POST = handler(async ({ req, user }) => {
  const i = await body(req, z.object({ threadId: z.string().max(64).optional(), topic: z.enum(Object.keys(TOPICS) as [Topic, ...Topic[]]), message: z.string().trim().min(1).max(6000) }));
  let thread = i.threadId ? await db.query.chatThreads.findFirst({ where: and(eq(schema.chatThreads.id, i.threadId), eq(schema.chatThreads.userId, user.id)) }) : undefined;
  if (i.threadId && !thread) throw new HttpError(404, "Conversation not found");
  if (!thread) [thread] = await db.insert(schema.chatThreads).values({ userId: user.id, topic: i.topic }).returning();
  await db.insert(schema.chatMessages).values({ threadId: thread.id, role: "user", contentEnc: encrypt(i.message) });

  const profile = await db.query.profiles.findFirst({ where: eq(schema.profiles.userId, user.id) });
  const consent = await consentFor(user.id);
  let reply: string;
  if (llmEnabled() && consent?.aiProcessing) {
    const history = await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.threadId, thread.id)).orderBy(desc(schema.chatMessages.createdAt)).limit(16);
    const msgs = history.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: decrypt(m.contentEnc) }));
    // Career context only — never demographics.
    const ctx = profile ? `User career context: target roles: ${profile.targetRoles.join(", ") || "n/a"}; industries: ${profile.industries.join(", ") || "n/a"}; location: ${profile.location || "n/a"}; work preference: ${profile.workPreference}; experience: ${profile.experienceLevel || "n/a"}; education: ${profile.education || "n/a"}; skills: ${profile.skills.join(", ") || "n/a"}.` : "";
    try { reply = await complete(msgs, { system: `Mode: ${TOPICS[thread.topic as Topic]?.prompt ?? TOPICS[i.topic].prompt}\n${ctx}`, maxTokens: 2000 }); }
    catch { reply = fallbackReply(i.topic, profile?.targetRoles[0] ?? ""); }
  } else reply = fallbackReply(i.topic, profile?.targetRoles[0] ?? "");
  await db.insert(schema.chatMessages).values({ threadId: thread.id, role: "assistant", contentEnc: encrypt(reply) });
  await db.update(schema.chatThreads).set({ updatedAt: new Date() }).where(eq(schema.chatThreads.id, thread.id));
  await track(`coach_${i.topic}`); await track("coach_message");
  return { threadId: thread.id, reply, ai: llmEnabled() && !!consent?.aiProcessing };
}, { auth: "user", limit: { key: "coach", max: 80, windowMs: 60 * 60_000 } });

export const DELETE = handler(async ({ req, user }) => {
  const id = req.nextUrl.searchParams.get("threadId");
  if (id) await db.delete(schema.chatThreads).where(and(eq(schema.chatThreads.id, id), eq(schema.chatThreads.userId, user.id)));
  return { ok: true };
});
