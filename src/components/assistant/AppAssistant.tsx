"use client";
import { useRouter } from "next/navigation";
import { AssistantWidget } from "./AssistantWidget";

export function AppAssistant({ ai }: { ai: boolean }) {
  const router = useRouter();
  return (
    <AssistantWidget
      note={ai ? "AI answers grounded in the EqualPath help guide. Conversations aren't saved." : "Answers come from the EqualPath help guide. Conversations aren't saved."}
      onNavigate={(href) => router.push(href)}
      ask={async (messages) => {
        const r = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "failed");
        return r.json();
      }}
    />
  );
}
