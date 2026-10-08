import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: ComponentProps<'section'>) {
  return <section className={cn('card rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6', className)} {...rest} />;
}

export function CardHeader({ title, description, action, as: Heading = 'h2' }: { title: ReactNode; description?: ReactNode; action?: ReactNode; as?: 'h2' | 'h3' }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <Heading className="text-lg font-semibold text-ink">{title}</Heading>
        {description ? <p className="mt-1 text-[15px] text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="no-print shrink-0">{action}</div> : null}
    </header>
  );
}
