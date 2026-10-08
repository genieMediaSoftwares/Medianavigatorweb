'use client';

import * as Popover from '@radix-ui/react-popover';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api/endpoints';
import { timeAgo } from '@/lib/format';
import { useUnreadCount } from '@/lib/hooks/useQueries';
import { qk } from '@/lib/queryKeys';
import { Skeleton } from '@/components/ui/skeleton';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const unread = useUnreadCount();
  const list = useQuery({ queryKey: ['notifications', 'latest'], queryFn: () => api.notifications({}), enabled: open });
  const refresh = () => { void qc.invalidateQueries({ queryKey: qk.unread }); void qc.invalidateQueries({ queryKey: ['notifications'] }); };
  const readAll = useMutation({ mutationFn: api.markAllRead, onSuccess: refresh });
  const readOne = useMutation({ mutationFn: api.markRead, onSuccess: refresh });
  const count = unread.data?.unread ?? 0;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label={count ? `Notifications, ${count} unread` : 'Notifications'} className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink hover:bg-brand-50">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white tabular">{count > 99 ? '99+' : count}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-[min(380px,calc(100vw-32px))] rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)] animate-rise">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-base font-bold text-ink">Notifications</p>
            <button onClick={() => readAll.mutate()} disabled={count === 0 || readAll.isPending} className="text-sm font-semibold text-brand-600 disabled:text-subtle">Mark all read</button>
          </div>
          <div className="custom-scroll max-h-96 overflow-y-auto">
            {list.isLoading && <div className="space-y-3 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}
            {list.isError && <p className="p-4 text-sm text-bad">We couldn&apos;t load your notifications.</p>}
            {list.data && list.data.items.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">You&apos;re all caught up. We&apos;ll tell you here when something changes.</p>}
            {list.data?.items.slice(0, 6).map((n) => (
              <button key={n.id} onClick={() => !n.read && readOne.mutate(n.id)} className="flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-brand-50">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand-600'}`} aria-label={n.read ? undefined : 'Unread'} />
                <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{n.title}</span><span className="block text-[13px] text-muted line-clamp-2">{n.description ?? n.body}</span><span className="mt-1 block text-xs text-subtle">{timeAgo(n.timestamp ?? n.createdAt)}</span></span>
              </button>
            ))}
          </div>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-brand-50">See all</Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
