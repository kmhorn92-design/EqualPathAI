"use client";
import { useEffect, useState } from "react";
import { LogoMark } from "../Logo";

export function LoadingScreen() {
  const [phase, setPhase] = useState<"show" | "fade" | "done">("show");
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("ep_intro") === "1"; sessionStorage.setItem("ep_intro", "1"); } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) { setPhase("done"); return; }
    const a = setTimeout(() => setPhase("fade"), 1300), b = setTimeout(() => setPhase("done"), 1900);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  if (phase === "done") return null;
  return (
    <div aria-hidden="true" className={`fixed inset-0 z-[90] grid place-items-center bg-ink transition-opacity duration-500 ${phase === "fade" ? "opacity-0" : "opacity-100"}`}>
      <div className="relative grid place-items-center">
        <div className="absolute h-40 w-40 animate-spinslow rounded-full border border-dashed border-violet-500/40" />
        <div className="absolute h-28 w-28 animate-[spinslow_8s_linear_infinite_reverse] rounded-full border border-cyan-400/30" />
        <div className="absolute h-24 w-24 rounded-full bg-violet-600/30 blur-2xl animate-pulseglow" />
        <LogoMark size={56} />
        <div className="absolute top-28 w-44 overflow-hidden rounded-full bg-white/5"><div className="h-0.5 w-full animate-shimmer bg-gradient-to-r from-transparent via-cyan-300 to-transparent bg-[length:200%_100%]" /></div>
        <p className="absolute top-32 whitespace-nowrap font-display text-xs uppercase tracking-[0.35em] text-slate-400">Charting your path</p>
      </div>
    </div>
  );
}
