'use client';

import * as Menu from '@radix-ui/react-dropdown-menu';
import { LogOut, Moon, Settings, Sun } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/components/providers/theme';
import { useMe } from '@/lib/hooks/useQueries';
import { api } from '@/lib/api/endpoints';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', className)} style={{ background: 'var(--gradient)' }}>{initials(name)}</span>;
}

function useSignOut() {
  const router = useRouter();
  const qc = useQueryClient();
  return async () => {
    try { await api.logout(); } finally { qc.clear(); router.replace('/sign-in'); }
  };
}

const item = 'flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-semibold text-ink outline-none data-[highlighted]:bg-brand-50';

function MenuBody() {
  const { data } = useMe();
  const { theme, toggle } = useTheme();
  const signOut = useSignOut();
  const name = data?.profile?.fullName || data?.user.email || '';
  return (
    <Menu.Portal>
      <Menu.Content align="end" sideOffset={8} className="z-50 w-64 rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)] animate-rise">
        <div className="border-b border-line px-3 pb-3 pt-2"><p className="truncate text-sm font-bold text-ink">{name}</p><p className="truncate text-[13px] text-muted">{data?.user.email}</p></div>
        <div className="pt-2">
          <Menu.Item asChild><Link href="/settings" className={item}><Settings className="h-4 w-4" aria-hidden="true" />Settings</Link></Menu.Item>
          <Menu.Item className={item} onSelect={(e) => { e.preventDefault(); toggle(); }}>{theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}{theme === 'dark' ? 'Light theme' : 'Dark theme'}</Menu.Item>
          <Menu.Item className={cn(item, 'text-bad')} onSelect={() => void signOut()}><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</Menu.Item>
        </div>
      </Menu.Content>
    </Menu.Portal>
  );
}

/** Account card pinned to the bottom of the sidebar. */
export function AccountCard({ collapsed }: { collapsed?: boolean }) {
  const { data } = useMe();
  const name = data?.profile?.fullName || data?.user.email || 'Account';
  return (
    <Menu.Root>
      <Menu.Trigger aria-label="Account menu" className={cn('flex w-full items-center gap-3 rounded-xl border border-line bg-app p-2.5 text-left hover:border-brand-200', collapsed && 'justify-center p-1.5')}>
        <Avatar name={name} />
        {!collapsed && <span className="min-w-0"><span className="block truncate text-sm font-bold text-ink">{name}</span><span className="block truncate text-xs text-muted">{data?.user.email}</span></span>}
      </Menu.Trigger>
      <MenuBody />
    </Menu.Root>
  );
}

/** Compact avatar button for the top bar. */
export function AccountMenu() {
  const { data } = useMe();
  const name = data?.profile?.fullName || data?.user.email || 'Account';
  return (
    <Menu.Root>
      <Menu.Trigger aria-label="Account menu" className="rounded-full focus-visible:outline-offset-4"><Avatar name={name} /></Menu.Trigger>
      <MenuBody />
    </Menu.Root>
  );
}
