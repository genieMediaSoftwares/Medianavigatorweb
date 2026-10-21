import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Tone = 'neutral' | 'brand' | 'good' | 'warn' | 'bad';

const TONES: Record<Tone, string> = {
  neutral: 'bg-brand-50 text-muted border-line',
  brand: 'bg-brand-100 text-brand-700 border-brand-200',
  good: 'bg-good-bg text-good border-transparent',
  warn: 'bg-warn-bg text-warn border-transparent',
  bad: 'bg-bad-bg text-bad border-transparent',
};

export function Badge({ tone = 'neutral', dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold leading-none whitespace-nowrap', TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
