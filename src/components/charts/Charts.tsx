"use client";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, CartesianGrid } from "recharts";

const tip = { contentStyle: { background: "#121827", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "#fff" }, cursor: { fill: "rgba(139,92,246,.08)" } };

export function PipelineChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <div className="h-56" role="img" aria-label={`Applications by status: ${data.map((d) => `${d.status} ${d.count}`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
          <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8B5CF6" /><stop offset="1" stopColor="#22D3EE" stopOpacity=".6" /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,.05)" />
          <XAxis dataKey="status" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip {...tip} />
          <Bar dataKey="count" fill="url(#pg)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreChart({ data }: { data: { label: string; pct: number }[] }) {
  return (
    <div className="h-56" role="img" aria-label="Practice score trend">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,.05)" />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip {...tip} formatter={(v) => [`${v}%`, "Score"]} />
          <Line type="monotone" dataKey="pct" stroke="#22D3EE" strokeWidth={2.5} dot={{ fill: "#8B5CF6", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
