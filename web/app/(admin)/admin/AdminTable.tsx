'use client';

import type { ReactNode } from 'react';
import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/States';
import type { Page } from '@/types/api';

export const PAGE_SIZE = 25;

export function usePaged<T>(key: QueryKey, fetchPage: (cursor?: string) => Promise<Page<T>>) {
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Paginated admin table with its loading, empty, error and "Show more" states. */
export function AdminTable<T>({ query, columns, rowKey, caption, empty }: {
  query: ReturnType<typeof usePaged<T>>;
  columns: Array<{ label: string; cell: (row: T) => ReactNode }>;
  rowKey: (row: T) => string;
  caption: string;
  empty: string;
}) {
  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const rows = query.data.pages.flatMap((p) => p.items);
  if (rows.length === 0) return <EmptyState title={empty} />;
  const total = query.data.pages[0]?.total;
  return (
    <>
      {total !== undefined ? <p className="mb-2 text-sm text-ink-muted">{total} in total</p> : null}
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-2 text-sm text-ink-muted">
            <tr>{columns.map((c) => <th key={c.label} scope="col" className="px-4 py-3 font-semibold">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="border-t border-line align-top">
                {columns.map((c) => <td key={c.label} className="px-4 py-3">{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {query.hasNextPage ? (
        <div className="mt-4 text-center">
          <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Show more</Button>
        </div>
      ) : null}
    </>
  );
}
