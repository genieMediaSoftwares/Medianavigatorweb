import { AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { ApiError } from '@/lib/api/client';
import { Button } from './button';
import { cn } from '@/lib/utils';

/** The single empty-state pattern: say what is missing, then offer one next step. */
export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('card flex flex-col items-center px-6 py-14 text-center', className)}>
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>}
      <h3 className="text-xl">{title}</h3>
      {description && <p className="mt-2 max-w-md text-[15px] text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "We couldn't load this" }: { error: unknown; onRetry?: () => void; title?: string }) {
  const message = error instanceof ApiError || error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  return (
    <div role="alert" className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bad-bg text-bad"><AlertTriangle className="h-7 w-7" aria-hidden="true" /></div>
      <h3 className="text-xl">{title}</h3>
      <p className="mt-2 max-w-md text-[15px] text-muted">{message}</p>
      {onRetry && <Button className="mt-6" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Notice({ tone = 'info', children, className }: { tone?: 'info' | 'good' | 'warn' | 'bad'; children: ReactNode; className?: string }) {
  const styles = { info: 'bg-brand-50 text-brand-800 border-brand-100', good: 'bg-good-bg text-good border-transparent', warn: 'bg-warn-bg text-warn border-transparent', bad: 'bg-bad-bg text-bad border-transparent' }[tone];
  return (
    <div role={tone === 'bad' || tone === 'warn' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border px-4 py-3 text-sm', styles, className)}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
