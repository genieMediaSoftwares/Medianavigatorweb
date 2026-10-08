import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatChange } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * One big number with a one-sentence meaning. `change` is the API's percentage change against the previous period;
 * when the API says there is nothing comparable, pass null and the line says so instead of showing 0.
 */
export function StatCard({ label, value, meaning, change, changeLabel = 'from the period before', className }: {
  label: string;
  value: ReactNode;
  meaning?: ReactNode;
  change?: number | null;
  changeLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('card rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]', className)}>
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">{value}</p>
      {change !== undefined ? <ChangeLine change={change} label={changeLabel} /> : null}
      {meaning ? <p className="mt-2 text-[15px] text-ink-muted">{meaning}</p> : null}
    </div>
  );
}

export function ChangeLine({ change, label }: { change: number | null; label: string }) {
  if (change === null) return <p className="mt-2 text-sm text-ink-subtle">Not enough earlier posts to compare yet</p>;
  const up = change >= 0.5;
  const down = change <= -0.5;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <p className={cn('mt-2 inline-flex items-center gap-1 text-sm font-semibold', up ? 'text-good-fg' : down ? 'text-warn-fg' : 'text-ink-muted')}>
      <Icon className="size-4" aria-hidden />
      <span>
        {up || down ? `${up ? 'Up' : 'Down'} ${formatChange(Math.abs(change)).replace('+', '')} ${label}` : `About the same as ${label.replace(/^from /, '')}`}
      </span>
    </p>
  );
}
