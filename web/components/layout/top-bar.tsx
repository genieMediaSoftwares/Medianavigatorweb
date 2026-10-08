'use client';

import { RefreshCw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { useChannel } from '@/lib/hooks/useChannel';
import { useConnections } from '@/lib/hooks/useQueries';
import { useSync } from '@/lib/hooks/useSync';
import { titleFor } from '@/lib/nav';
import { platformName } from '@/lib/platforms';
import type { Platform } from '@/types/api';
import { AccountMenu } from './account';
import { NotificationBell } from './notification-bell';

export function TopBar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { channel, setChannel } = useChannel();
  const { data: connections } = useConnections();
  const sync = useSync();
  const live = (connections ?? []).filter((c) => c.connected);
  const syncing = sync.active.length > 0;
  const hasLive = live.length > 0;

  return (
    <header className={`fixed inset-x-0 top-0 z-20 h-[72px] border-b border-line bg-surface/90 backdrop-blur transition-[padding] duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[264px]'}`}>
      <div className="mx-auto flex h-full max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5 lg:hidden"><LogoMark size={28} /><span className="font-display text-lg font-bold text-ink">{titleFor(pathname)}</span></div>
        <div className="hidden lg:block">
          {hasLive && (
            <label className="relative flex items-center">
              <span className="sr-only">Channel</span>
              <select value={channel} onChange={(e) => setChannel(e.target.value as Platform | 'all')} className="h-11 appearance-none rounded-xl border border-line-strong bg-surface pl-4 pr-10 text-sm font-semibold text-ink hover:border-brand-200">
                <option value="all">All channels</option>
                {live.map((c) => <option key={c.platform} value={c.platform}>{platformName(c.platform)}</option>)}
              </select>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute right-3.5 h-4 w-4 text-subtle"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </label>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {hasLive && (
            <Button size="md" variant="primary" onClick={() => void sync.start(channel === 'all' ? 'all' : channel)} disabled={syncing} aria-live="polite">
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span className="hidden sm:inline">{syncing ? `Updating ${sync.active.length}…` : 'Sync'}</span>
              <span className="sr-only sm:hidden">{syncing ? 'Updating' : 'Sync'}</span>
            </Button>
          )}
          <NotificationBell />
          <AccountMenu />
        </div>
      </div>
      {hasLive && (
        <div className="sr-only" aria-live="polite">{syncing ? `Updating ${sync.active.map(platformName).join(', ')}` : ''}</div>
      )}
    </header>
  );
}
