'use client';

import type { ReactNode } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/** The one empty state: says what is missing and offers the single next step. */
export function EmptyState({ icon, title, body, action, className }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface px-6 py-10 text-center', className)}>
      {icon ? <div className="mb-3 grid size-12 place-items-center rounded-full bg-tint text-action" aria-hidden>{icon}</div> : null}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {body ? <p className="mt-2 max-w-md text-ink-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}

/** The one error state: the API's message, a Retry button, and a reference for support. */
export function ErrorState({ error, onRetry, title = "This didn't load", className }: { error: unknown; onRetry?: () => void; title?: string; className?: string }) {
  const requestId = error instanceof ApiError ? error.requestId : null;
  return (
    <div role="alert" className={cn('flex flex-col items-center rounded-[var(--radius-card)] border border-line bg-surface px-6 py-8 text-center', className)}>
      <AlertCircle className="mb-2 size-7 text-bad-fg" aria-hidden />
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-ink-muted">{errorMessage(error)}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-4" onClick={onRetry} icon={<RotateCw className="size-4" aria-hidden />}>
          Retry
        </Button>
      ) : null}
      {requestId ? <p className="mt-3 text-xs text-ink-subtle">Reference for support: {requestId}</p> : null}
    </div>
  );
}

/** Inline form-level error. */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-[var(--radius-control)] bg-bad-bg px-3 py-2.5 text-[15px] text-bad-fg">
      {typeof error === 'string' ? error : errorMessage(error)}
    </p>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton', className)} />;
}

/** Skeleton shaped like a grid of cards. */
export function CardsSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-4 h-8 w-1/2" />
          <Skeleton className="mt-3 h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <Skeleton className="size-14 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
