'use client';

import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Page } from '@/lib/api/endpoints';
import type { Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { ApiUnreachableBanner, isUnreachable } from '@/components/system/api-unreachable';

/** Common four-state wrapper for a "Load more" list. */
export function PagedList<T>({ q, empty, children }: { q: UseInfiniteQueryResult<InfiniteData<Page<T>>, Error>; empty: string; children: (items: T[]) => ReactNode }) {
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      {q.isLoading && <div className="card space-y-3 p-6"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}
      {q.isError && (isUnreachable(q.error) ? <ApiUnreachableBanner onRetry={() => void q.refetch()} /> : <ErrorState error={q.error} onRetry={() => void q.refetch()} />)}
      {q.data && items.length === 0 && <EmptyState title={empty} />}
      {items.length > 0 && children(items)}
      {q.hasNextPage && <div className="mt-6 text-center"><Button variant="secondary" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>Load more</Button></div>}
    </>
  );
}

export const infinite = <T,>(fetchPage: (cursor?: string) => Promise<Page<T>>) => ({
  queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchPage(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last: Page<T>) => last.nextCursor ?? undefined,
});

export const statusTone = (s: string): Tone => {
  if (['connected', 'sync_complete', 'succeeded', 'active', 'ok', 'up'].includes(s)) return 'good';
  if (['failed', 'sync_failed', 'disabled', 'connection_expired', 'down', 'error'].includes(s)) return 'bad';
  if (['partial', 'permission_required', 'running', 'syncing', 'queued', 'connecting'].includes(s)) return 'warn';
  return 'neutral';
};
export const statusLabel = (s: string): string => { const t = s.replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };

export function TableCard({ children }: { children: ReactNode }) {
  return <div className="card overflow-hidden"><div className="custom-scroll overflow-x-auto">{children}</div></div>;
}
export const th = 'whitespace-nowrap border-b border-line bg-app px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted';
export const td = 'border-b border-line px-4 py-3 align-middle text-sm text-text';
