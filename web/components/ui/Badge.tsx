import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Tone } from '@/lib/copy';

const tones: Record<Tone, string> = {
  good: 'bg-good-bg text-good-fg',
  warn: 'bg-warn-bg text-warn-fg',
  bad: 'bg-bad-bg text-bad-fg',
  neutral: 'bg-neutral-bg text-neutral-fg',
  info: 'bg-info-bg text-info-fg',
};

/** A labelled status. Colour always comes with words, never alone. */
export function Badge({ tone = 'neutral', children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold leading-none', tones[tone], className)}>
      {icon ?? <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
