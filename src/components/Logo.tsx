import Link from "next/link";
import { useId } from "react";
export function LogoMark({ size = 32 }: { size?: number }) {
  const id = `lg${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8B5CF6" /><stop offset="1" stopColor="#22D3EE" /></linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#121827" stroke={`url(#${id})`} strokeWidth="1.5" />
      <path d="M11 26 L20 12 L29 26" fill="none" stroke={`url(#${id})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 21 H25.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="20" cy="12" r="2.4" fill="#22D3EE" />
    </svg>
  );
}
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label="EqualPath AI home">
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight">EqualPath <span className="gradient-text">AI</span></span>
    </Link>
  );
}
