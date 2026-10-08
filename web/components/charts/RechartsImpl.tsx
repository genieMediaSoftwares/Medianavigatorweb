'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const axis = { stroke: 'var(--ink-subtle)', fontSize: 12, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)', fontSize: 14 },
  labelStyle: { color: 'var(--ink-muted)' },
};

export function AreaTrend({ data, x, y, format, name }: { data: object[]; x: string; y: string; format: (n: number) => string; name: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="mn-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey={x} {...axis} minTickGap={24} />
        <YAxis {...axis} width={56} tickFormatter={(v: number) => format(v)} />
        <Tooltip {...tooltipStyle} formatter={(v) => [format(Number(v)), name]} />
        <Area type="monotone" dataKey={y} name={name} stroke="var(--chart-1)" strokeWidth={2} fill="url(#mn-area)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, x, y, format, name }: { data: object[]; x: string; y: string; format: (n: number) => string; name: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
        <XAxis type="number" {...axis} tickFormatter={(v: number) => format(v)} />
        <YAxis type="category" dataKey={x} {...axis} width={110} />
        <Tooltip {...tooltipStyle} formatter={(v) => [format(Number(v)), name]} cursor={{ fill: 'var(--surface-2)' }} />
        <Bar dataKey={y} name={name} fill="var(--chart-1)" radius={[0, 6, 6, 0]} isAnimationActive={false}>
          <LabelList dataKey={y} position="right" formatter={(v: unknown) => format(Number(v))} style={{ fill: 'var(--ink-muted)', fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, y }: { data: object[]; y: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <Line type="monotone" dataKey={y} stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
