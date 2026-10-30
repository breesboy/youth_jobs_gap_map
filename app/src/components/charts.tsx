"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tick = { fill: "var(--muted)", fontSize: 12 };
const tooltipStyle = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    boxShadow: "var(--shadow)",
    fontSize: 13,
    color: "var(--ink)",
  },
  itemStyle: { color: "var(--ink)" },
  labelStyle: { color: "var(--muted)", marginBottom: 4 },
  cursor: { fill: "var(--surface-2)" },
};
const legend = { wrapperStyle: { fontSize: 12, color: "var(--muted)", paddingTop: 8 }, iconType: "circle" as const, iconSize: 8 };
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export type StackRow = { name: string } & Record<string, number | string>;

export function StackedScores({ data, keys }: { data: StackRow[]; keys: { key: string; label: string }[] }) {
  return (
    <div className="h-[340px]" role="img" aria-label="Stacked bar chart of the highest gap scores by component">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }} barSize={14}>
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" tick={tick} axisLine={false} tickLine={false} domain={[0, 100]} />
          <YAxis type="category" dataKey="name" tick={{ ...tick, fill: "var(--ink)" }} axisLine={false} tickLine={false} width={84} />
          <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [`${v.toFixed(1)} pts`, n]} />
          <Legend {...legend} />
          {keys.map((k, i) => (
            <Bar isAnimationActive={false} key={k.key} dataKey={k.key} name={k.label} stackId="s" fill={COLORS[i]} radius={i === keys.length - 1 ? [0, 6, 6, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="relative h-[240px]" role="img" aria-label="Donut chart of youth activity status">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
          <Legend {...legend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WorkVsTraining({ data, height = 320 }: { data: { name: string; work: number; training: number }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Bar chart comparing share of local work and share of accredited training by sector">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }} barGap={3} barSize={9}>
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
          <YAxis type="category" dataKey="name" tick={{ ...tick, fill: "var(--ink)" }} axisLine={false} tickLine={false} width={130} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
          <Legend {...legend} />
          <Bar isAnimationActive={false} dataKey="work" name="Share of local work" fill="var(--chart-4)" radius={[0, 5, 5, 0]} />
          <Bar isAnimationActive={false} dataKey="training" name="Share of accredited training" fill="var(--chart-1)" radius={[0, 5, 5, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
