'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, ChevronDown } from 'lucide-react';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { timeAgo } from '@/lib/format';
import { qk } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/types/api';

const SEVERITY: Record<string, { tone: Tone; label: string }> = {
  high: { tone: 'bad', label: 'Needs attention' },
  medium: { tone: 'warn', label: 'Worth a look' },
  info: { tone: 'neutral', label: 'For your information' },
};

function Row({ n, onRead }: { n: NotificationItem; onRead: (id: string) => void }) {
  const sev = SEVERITY[n.severity] ?? { tone: 'neutral' as Tone, label: 'For your information' };
  const text = n.description ?? n.body;
  return (
    <li className={cn('flex gap-4 px-6 py-5', !n.read && 'bg-brand-50/60')}>
      <span className={cn('mt-2 h-2.5 w-2.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand-600')} role={n.read ? undefined : 'img'} aria-label={n.read ? undefined : 'Unread'} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="text-base font-semibold text-ink">{n.title}</h3>
          <Badge tone={sev.tone}>{sev.label}</Badge>
          <span className="text-sm text-subtle">{timeAgo(n.timestamp ?? n.createdAt)}</span>
        </div>
        {text && <p className="mt-1.5 text-[15px] text-muted">{text}</p>}
        {n.investigationNotes && (
          <details className="group mt-3">
            <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-brand-600 [&::-webkit-details-marker]:hidden">Show details<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
            <p className="mt-2 whitespace-pre-line rounded-xl bg-app p-4 text-sm text-muted">{n.investigationNotes}</p>
          </details>
        )}
        {!n.read && <Button size="sm" variant="ghost" className="-ml-3 mt-2" onClick={() => onRead(n.id)}>Mark as read</Button>}
      </div>
    </li>
  );
}

export function NotificationsView() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useInfiniteQuery({
    queryKey: [...qk.notifications, 'all'],
    queryFn: ({ pageParam }) => api.notifications({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const refresh = () => { void qc.invalidateQueries({ queryKey: qk.notifications }); void qc.invalidateQueries({ queryKey: qk.unread }); };
  const onError = (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
  const readOne = useMutation({ mutationFn: api.markRead, onSuccess: refresh, onError });
  const readAll = useMutation({ mutationFn: api.markAllRead, onSuccess: refresh, onError });
  const anyUnread = items.some((n) => !n.read);

  return (
    <>
      <PageHeader title="Notifications" subtitle="Changes we noticed in your accounts and posts."
        action={<Button variant="secondary" disabled={!anyUnread} loading={readAll.isPending} onClick={() => readAll.mutate()}>Mark all as read</Button>} />
      {q.isLoading && <Card className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></Card>}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {q.data && items.length === 0 && <EmptyState icon={<BellRing className="h-7 w-7" />} title="You’re all caught up" description="When something changes in your accounts, we’ll tell you here." action={<LinkButton href="/home" variant="secondary">Back to Home</LinkButton>} />}
      {items.length > 0 && (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">{items.map((n) => <Row key={n.id} n={n} onRead={(id) => readOne.mutate(id)} />)}</ul>
        </div>
      )}
      {q.hasNextPage && <div className="mt-6 text-center"><Button variant="secondary" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>Load more</Button></div>}
    </>
  );
}
