'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compact } from '@/lib/format';
import { ChartFrame } from './chart-frame';

export interface TrendPoint { label: string; value: number }

export function AreaTrend({ caption, summary, data, valueLabel }: { caption: string; summary: string; data: TrendPoint[]; valueLabel: string }) {
  return (
    <ChartFrame caption={caption} summary={summary} table={{ columns: ['Date', valueLabel], rows: data.map((d) => [d.label, d.value.toLocaleString('en')]) }}>
      <div className="h-64 w-full" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-600)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--brand-600)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => compact(v)} />
            <Tooltip formatter={(v) => [Number(v).toLocaleString('en'), valueLabel]} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--text)', fontSize: 13 }} />
            <Area type="monotone" dataKey="value" stroke="var(--brand-600)" strokeWidth={2.5} fill="url(#areaFill)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
