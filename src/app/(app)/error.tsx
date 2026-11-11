"use client";
import { ErrorBox } from "@/components/ui";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <div className="space-y-4"><ErrorBox>We couldn&apos;t load this page. Your data is safe.</ErrorBox><button className="btn-ghost" onClick={reset}>Try again</button></div>;
}
