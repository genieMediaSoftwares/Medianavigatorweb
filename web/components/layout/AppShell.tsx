'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { MoreHorizontal, X } from 'lucide-react';
import { ChannelProvider, SyncProvider } from '@/components/providers/AppContext';
import { useMe } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { ADMIN_NAV, NAV, NOTIFICATIONS_NAV, isActive, type NavItem } from './nav';
import { TopBar } from './TopBar';
import { ApiBanner } from './ApiBanner';
import { Logo } from './Logo';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ChannelProvider>
      <SyncProvider>
        <Shell>{children}</Shell>
      </SyncProvider>
    </ChannelProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();
  // The role shown here only decides whether to show a link; the server enforces admin access on every request.
  const isAdmin = me.data?.user.role === 'admin';
  const items = isAdmin ? [...NAV, ADMIN_NAV] : NAV;

  // First sign-in: finish the two-step setup before anything else.
  const needsOnboarding = me.data ? !me.data.profile?.onboardingCompleted : false;
  useEffect(() => {
    if (needsOnboarding && pathname !== '/onboarding') router.replace('/onboarding');
  }, [needsOnboarding, pathname, router]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <a href="#main" className="sr-only z-[70] rounded-lg bg-surface px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <aside className="no-print sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link href="/home" className="mb-6 flex min-h-11 items-center px-2" aria-label="Media Navigator home">
          <Logo />
        </Link>
        <nav aria-label="Main">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <SideLink item={item} active={isActive(pathname, item.match)} />
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-auto px-2 text-xs leading-relaxed text-ink-subtle">Read-only: Media Navigator never posts, edits or deletes anything on your accounts.</p>
      </aside>
      <div className="flex min-w-0 flex-col">
        <TopBar />
        <ApiBanner />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav items={items} pathname={pathname} />
    </div>
  );
}

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors',
        active ? 'bg-tint text-action' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
      )}
    >
      <Icon className="size-5" aria-hidden />
      {item.label}
    </Link>
  );
}

/** Phones: the first four destinations plus "More". */
function BottomNav({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.slice(0, 4);
  const rest = [...items.slice(4), NOTIFICATIONS_NAV];
  const moreActive = rest.some((i) => isActive(pathname, i.match));

  return (
    <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid grid-cols-5">
        {primary.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.match);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn('flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold', active ? 'text-action' : 'text-ink-muted')}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <RD.Root open={moreOpen} onOpenChange={setMoreOpen}>
            <RD.Trigger className={cn('flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold', moreActive ? 'text-action' : 'text-ink-muted')}>
              <MoreHorizontal className="size-5" aria-hidden />
              More
            </RD.Trigger>
            <RD.Portal>
              <RD.Overlay className="fixed inset-0 z-50 bg-black/40" />
              <RD.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
                <div className="mb-2 flex items-center justify-between">
                  <RD.Title className="font-semibold">More</RD.Title>
                  <RD.Description className="sr-only">Other pages</RD.Description>
                  <RD.Close className="grid size-11 place-items-center rounded-lg" aria-label="Close">
                    <X className="size-5" aria-hidden />
                  </RD.Close>
                </div>
                <ul className="space-y-1">
                  {rest.map((item) => (
                    <li key={item.href} onClick={() => setMoreOpen(false)}>
                      <SideLink item={item} active={isActive(pathname, item.match)} />
                    </li>
                  ))}
                </ul>
              </RD.Content>
            </RD.Portal>
          </RD.Root>
        </li>
      </ul>
    </nav>
  );
}
