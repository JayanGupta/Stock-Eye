"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "oklch(0.72 0.14 205)",
  "oklch(0.62 0.19 250)",
  "oklch(0.68 0.15 285)",
  "oklch(0.78 0.15 85)",
  "oklch(0.68 0.19 15)",
  "oklch(0.75 0.1 160)",
];

type TooltipEntry = {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
};

function TooltipCard({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label ? (
        <p className="mb-1 font-medium text-foreground">{label}</p>
      ) : null}
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="text-muted-foreground">
          {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueTrendChart({
  data,
  currency = "INR",
}: {
  data: { month: string; revenue: number; units: number }[];
  currency?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => (currency === "INR" ? `₹${v / 1000}k` : `${v}`)}
        />
        <Tooltip content={<TooltipCard />} cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.3 }} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--chart-2)"
          strokeWidth={2}
          fill="url(#rev)"
          name="Revenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonutChart({
  data,
}: {
  data: { category: string; revenue: number }[];
}) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={sorted}
          dataKey="revenue"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          stroke="var(--card)"
        >
          {sorted.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<TooltipCard />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function LegendList({
  data,
}: {
  data: { category: string; revenue: number }[];
}) {
  const total = data.reduce((acc, d) => acc + d.revenue, 0) || 1;
  return (
    <ul className="space-y-2">
      {data.slice(0, 5).map((d, i) => (
        <li key={d.category} className="flex items-center gap-2 text-sm">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          />
          <span className="flex-1 truncate text-muted-foreground">{d.category}</span>
          <span className="font-medium">{Math.round((d.revenue / total) * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}
