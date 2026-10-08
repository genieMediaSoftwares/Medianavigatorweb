'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CardsSkeleton, Skeleton } from '@/components/ui/States';

/** Used by every loading.tsx: a skeleton shaped like a page header and a row of cards. */
export function RouteLoading() {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <CardsSkeleton className="mt-8" />
    </div>
  );
}

/** Used by every error.tsx. */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center">
      <AlertTriangle className="mx-auto size-8 text-bad-fg" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold">This page ran into a problem</h1>
      <p className="mt-2 text-ink-muted">Something unexpected happened while showing this page. Trying again usually fixes it.</p>
      <Button className="mt-5" onClick={reset} icon={<RotateCw className="size-4" aria-hidden />}>Try again</Button>
      {error.digest ? <p className="mt-3 text-xs text-ink-subtle">Reference: {error.digest}</p> : null}
    </div>
  );
}
