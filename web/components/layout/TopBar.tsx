'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as DM from '@radix-ui/react-dropdown-menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronDown, LogOut, Monitor, Moon, RefreshCw, Settings, Sun, User } from 'lucide-react';
import { authApi, connectionsApi, notificationsApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { PLATFORM_LABEL } from '@/lib/copy';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import { connectedOnly, useConnections, useMe, useSessionNavigate } from '@/lib/hooks';
import { useChannel, useSync } from '@/components/providers/AppContext';
import { useTheme, type ThemeChoice } from '@/components/providers/ThemeProvider';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/components/ui/States';
import { pageTitle } from './nav';
import { Logo } from './Logo';

const menuContent = 'z-50 min-w-60 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-card)]';
const menuItem = 'flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 text-[15px] text-ink outline-none data-[highlighted]:bg-surface-2';

export function TopBar() {
  const pathname = usePathname();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-6">
        <Link href="/home" className="lg:hidden" aria-label="Media Navigator home">
          <Logo compact />
        </Link>
        <p className="mr-auto truncate text-lg font-semibold text-ink" aria-hidden>
          {pageTitle(pathname)}
        </p>
        <ChannelPicker />
        <SyncButton />
        <NotificationBell />
        <AccountMenu />
      </div>
    </header>
  );
}

function ChannelPicker() {
  const { channel, setChannel, connected } = useChannel();
  if (connected.length < 2) return null;
  return (
    <label className="hidden sm:block">
      <span className="sr-only">Show results for</span>
      <select
        value={channel}
        onChange={(e) => setChannel(e.target.value as typeof channel)}
        className="min-h-11 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 pr-8 text-[15px] font-semibold text-ink"
      >
        <option value="all">All channels</option>
        {connected.map((p) => (
          <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
        ))}
      </select>
    </label>
  );
}

function SyncButton() {
  const { data } = useConnections();
  const { active, track } = useSync();
  const toast = useToast();
  const live = connectedOnly(data).filter((c) => c.status !== 'connection_expired');
  const sync = useMutation({
    mutationFn: connectionsApi.syncAll,
    onSuccess: (r) => {
      track(r.syncRuns);
      toast(r.syncRuns.length ? 'Import started. We\'ll let you know when it\'s done.' : 'Nothing to import right now.');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  if (live.length === 0) return null;
  const busy = active.length > 0 || sync.isPending;
  const lastSynced = live.map((c) => c.sync.lastSyncedAt).filter((v): v is string => Boolean(v)).sort().pop();
  return (
    <button
      type="button"
      onClick={() => sync.mutate()}
      disabled={busy}
      className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-[15px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-70"
      title={lastSynced ? `Updated ${timeAgo(lastSynced)}` : 'Not updated yet'}
    >
      <RefreshCw className={cn('size-4', busy && 'animate-spin')} aria-hidden />
      <span className="hidden sm:inline">{busy ? `Importing${active.length > 1 ? ` (${active.length})` : '…'}` : 'Sync'}</span>
      <span className="sr-only sm:hidden">{busy ? 'Importing' : 'Sync all channels'}</span>
    </button>
  );
}

function NotificationBell() {
  const client = useQueryClient();
  const unread = useQuery({ queryKey: qk.unread, queryFn: notificationsApi.unreadCount, refetchInterval: 60_000 });
  const latest = useQuery({ queryKey: [...qk.notifications, 'latest'], queryFn: () => notificationsApi.page({ limit: 5 }) });
  const refresh = () => void client.invalidateQueries({ queryKey: qk.notifications });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refresh });
  const count = unread.data?.unread ?? 0;

  return (
    <DM.Root>
      <DM.Trigger
        className="relative grid size-11 place-items-center rounded-[var(--radius-control)] text-ink hover:bg-surface-2"
        aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}
      >
        <Bell className="size-5" aria-hidden />
        {count > 0 ? (
          <span className="absolute right-1 top-1 min-w-5 rounded-full bg-action px-1 text-center text-xs font-bold leading-5 text-on-action" aria-hidden>
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="end" sideOffset={6} collisionPadding={16} className={cn(menuContent, 'w-[min(380px,calc(100vw-32px))]')}>
          <div className="flex items-center justify-between px-3 py-2">
            <p className="font-semibold">Notifications</p>
            {count > 0 ? (
              <button type="button" className="min-h-11 text-sm font-semibold text-action" onClick={() => markAll.mutate()}>
                Mark all read
              </button>
            ) : null}
          </div>
          {latest.isPending ? (
            <p className="px-3 py-4 text-sm text-ink-muted">Loading…</p>
          ) : latest.isError ? (
            <p className="px-3 py-4 text-sm text-bad-fg">{errorMessage(latest.error)}</p>
          ) : latest.data.items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink-muted">You&apos;re all caught up. We&apos;ll tell you here when something changes.</p>
          ) : (
            latest.data.items.map((n) => (
              <DM.Item key={n.id} className={cn(menuItem, 'items-start py-2.5')} onSelect={() => !n.read && markRead.mutate(n.id)}>
                <span className={cn('mt-2 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-action')} aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{n.title}</span>
                  <span className="block truncate text-sm text-ink-muted">{n.body}</span>
                  <span className="block text-xs text-ink-subtle">{timeAgo(n.createdAt)}{n.read ? '' : ' · unread'}</span>
                </span>
              </DM.Item>
            ))
          )}
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Item asChild className={menuItem}>
            <Link href="/notifications">See all</Link>
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

const THEMES: Array<{ value: ThemeChoice; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'Match my device', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

function AccountMenu() {
  const me = useMe();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const go = useSessionNavigate();
  const signOut = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => go('/sign-in'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const name = me.data?.profile?.fullName ?? me.data?.user.email ?? '';

  return (
    <DM.Root>
      <DM.Trigger className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-ink hover:bg-surface-2" aria-label="Account menu">
        <span className="grid size-8 place-items-center rounded-full bg-tint font-semibold text-action" aria-hidden>
          {name ? name.charAt(0).toUpperCase() : <User className="size-4" />}
        </span>
        <ChevronDown className="hidden size-4 sm:block" aria-hidden />
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="end" sideOffset={6} collisionPadding={16} className={menuContent}>
          {me.data ? (
            <div className="px-3 py-2">
              <p className="truncate font-semibold">{name}</p>
              <p className="truncate text-sm text-ink-muted">{me.data.user.email}</p>
            </div>
          ) : null}
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Item asChild className={menuItem}>
            <Link href="/settings">
              <Settings className="size-4" aria-hidden /> Settings
            </Link>
          </DM.Item>
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Label className="px-3 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Appearance</DM.Label>
          <DM.RadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeChoice)}>
            {THEMES.map((t) => (
              <DM.RadioItem key={t.value} value={t.value} className={menuItem}>
                <t.icon className="size-4" aria-hidden />
                <span className="flex-1">{t.label}</span>
                <DM.ItemIndicator className="text-action">✓</DM.ItemIndicator>
              </DM.RadioItem>
            ))}
          </DM.RadioGroup>
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Item className={menuItem} onSelect={() => signOut.mutate()}>
            <LogOut className="size-4" aria-hidden /> Sign out
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
