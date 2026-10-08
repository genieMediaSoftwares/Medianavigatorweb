import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { change } from '@/lib/format';
import { cn } from '@/lib/utils';

/** A big number with one sentence of meaning. `delta` is a % change vs the previous period (null = unknown). */
export function StatCard({ label, value, meaning, delta, icon }: { label: string; value: ReactNode; meaning?: ReactNode; delta?: number | null; icon?: ReactNode }) {
  const up = delta !== null && delta !== undefined && delta > 0;
  const down = delta !== null && delta !== undefined && delta < 0;
  return (
    <div className="card flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-muted">{label}</span>
        {icon && <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden="true">{icon}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-[34px] font-bold leading-none tracking-tight text-ink tabular">{value}</span>
        {(up || down) && (
          <span className={cn('inline-flex items-center gap-0.5 text-sm font-semibold', up ? 'text-good' : 'text-bad')}>
            {up ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : <ArrowDownRight className="h-4 w-4" aria-hidden="true" />}
            <span className="sr-only">{up ? 'Up' : 'Down'} </span>{change(delta)}
          </span>
        )}
      </div>
      {meaning && <p className="mt-2 text-sm text-muted">{meaning}</p>}
    </div>
  );
}
