'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { notificationsApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import type { Tone } from '@/lib/copy';
import { formatDateTime, timeAgo } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, ListSkeleton, errorMessage } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import type { Notification } from '@/types/api';

const SEVERITY: Record<Notification['severity'], { label: string; tone: Tone }> = {
  high: { label: 'Important', tone: 'bad' },
  medium: { label: 'Worth a look', tone: 'warn' },
  info: { label: 'For your information', tone: 'neutral' },
};

export function NotificationsView() {
  const tz = useMe().data?.profile?.timezone;
  const client = useQueryClient();
  const toast = useToast();
  const list = useInfiniteQuery({
    queryKey: [...qk.notifications, 'all'],
    queryFn: ({ pageParam }) => notificationsApi.page({ cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const refresh = () => void client.invalidateQueries({ queryKey: qk.notifications });
  const dismiss = useMutation({
    mutationFn: (n: Notification) => (n.type === 'alert' ? notificationsApi.dismissAlert(n.id) : notificationsApi.markRead(n.id).then(() => undefined)),
    onSuccess: refresh,
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refresh, onError: (e) => toast(errorMessage(e), 'error') });

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = items.some((n) => !n.read);

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Changes worth knowing about: imports, connection problems and posts that stood out."
        action={unread ? <Button variant="secondary" loading={markAll.isPending} onClick={() => markAll.mutate()}>Mark all read</Button> : undefined}
      />
      {list.isPending ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell className="size-6" />} title="You're all caught up" body="We'll let you know here when something changes." action={<ButtonLink href="/home" variant="secondary">Back to Home</ButtonLink>} />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((n) => {
              const sev = SEVERITY[n.severity];
              return (
                <li key={n.id} className={cn('rounded-[var(--radius-card)] border bg-surface p-4', n.read ? 'border-line' : 'border-action/40')}>
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={sev.tone}>{sev.label}</Badge>
                        {!n.read ? <span className="text-sm font-semibold text-action">New</span> : null}
                        <time dateTime={n.createdAt} title={formatDateTime(n.createdAt, tz)} className="text-sm text-ink-subtle">{timeAgo(n.createdAt)}</time>
                      </div>
                      <h2 className="mt-1.5 font-semibold">{n.title}</h2>
                      <p className="mt-0.5 text-[15px] text-ink-muted">{n.body}</p>
                    </div>
                    {!n.read ? (
                      <Button variant="ghost" size="sm" loading={dismiss.isPending && dismiss.variables?.id === n.id} onClick={() => dismiss.mutate(n)}>
                        {n.type === 'alert' ? 'Dismiss' : 'Mark as read'}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {list.hasNextPage ? (
            <div className="mt-6 text-center">
              <Button variant="secondary" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>Show more</Button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
