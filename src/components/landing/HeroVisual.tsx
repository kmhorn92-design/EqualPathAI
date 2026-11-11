import { CheckCircle2, Sparkles, Briefcase, FileText } from "lucide-react";

/** 3D-inspired, pure CSS/SVG hero illustration (no external assets). */
export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px] [perspective:1200px]" aria-hidden="true">
      <div className="absolute inset-[8%] animate-spinslow rounded-full border border-violet-500/20" />
      <div className="absolute inset-[20%] animate-[spinslow_26s_linear_infinite_reverse] rounded-full border border-dashed border-cyan-400/25" />
      <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-violet-600/40 via-fuchsia-500/10 to-cyan-500/30 blur-3xl" />
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="hv1" x1="0" x2="1"><stop offset="0" stopColor="#8B5CF6" /><stop offset="1" stopColor="#22D3EE" /></linearGradient>
          <radialGradient id="hv2"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#22D3EE" stopOpacity="0" /></radialGradient>
        </defs>
        <path d="M60 320 C 140 300, 160 200, 220 180 S 320 100, 350 60" fill="none" stroke="url(#hv1)" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 8" />
        {[[60, 320], [150, 262], [220, 180], [300, 112], [350, 60]].map(([x, y], i) => (
          <g key={i}><circle cx={x} cy={y} r="14" fill="url(#hv2)" opacity=".5" /><circle cx={x} cy={y} r="5" fill={i % 2 ? "#22D3EE" : "#8B5CF6"} /></g>
        ))}
      </svg>
      <div className="glass absolute left-[2%] top-[14%] w-48 animate-float p-3 [transform:rotateY(14deg)_rotateX(6deg)]">
        <div className="flex items-center gap-2 text-xs text-slate-300"><FileText size={14} className="text-violet-300" />Resume v3 · Healthcare</div>
        <div className="mt-2 space-y-1.5"><div className="h-1.5 w-full rounded bg-white/10" /><div className="h-1.5 w-4/5 rounded bg-white/10" /><div className="h-1.5 w-3/5 rounded bg-emerald-400/40" /></div>
      </div>
      <div className="glass absolute right-[0%] top-[38%] w-52 animate-float p-3 [animation-delay:-2s] [transform:rotateY(-16deg)]">
        <div className="flex items-center gap-2 text-xs text-cyan-200"><Sparkles size={14} />Keyword found in your experience</div>
        <div className="mt-2 flex flex-wrap gap-1"><span className="chip-green">EHR/EMR</span><span className="chip-green">Scheduling</span><span className="chip-amber">HIPAA?</span></div>
      </div>
      <div className="glass absolute bottom-[8%] left-[18%] w-56 animate-float p-3 [animation-delay:-4s] [transform:rotateX(10deg)]">
        <div className="flex items-center gap-2 text-xs text-slate-300"><Briefcase size={14} className="text-cyan-300" />Verified today · Remote</div>
        <div className="mt-1 text-sm font-semibold">Patient Access Rep</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-300"><CheckCircle2 size={12} />Direct employer link</div>
      </div>
    </div>
  );
}
