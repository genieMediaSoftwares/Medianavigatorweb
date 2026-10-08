'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SIGNED_OUT_EVENT } from '@/lib/api/client';
import { ChannelProvider } from '@/lib/hooks/useChannel';
import { useMe } from '@/lib/hooks/useQueries';
import { SyncProvider } from '@/lib/hooks/useSync';
import { PageSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

const COLLAPSE_KEY = 'mn-sidebar-collapsed';

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const me = useMe();
  // Remembered per browser; a convenience only, so a blocked storage is fine. The skeleton shown until the account loads
  // does not depend on it, so reading it in the initial state cannot cause a hydration mismatch.
  const [collapsed, setCollapsed] = useState(() => { try { return typeof window !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } });
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* ignore */ } return !c; });

  useEffect(() => {
    const out = () => { qc.clear(); router.replace(`/sign-in?reason=signed-out`); };
    window.addEventListener(SIGNED_OUT_EVENT, out);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, out);
  }, [qc, router]);

  const needsOnboarding = me.data && me.data.profile && !me.data.profile.onboardingCompleted;
  useEffect(() => { if (needsOnboarding && pathname !== '/onboarding') router.replace('/onboarding'); }, [needsOnboarding, pathname, router]);

  if (me.isLoading) return <div className="mx-auto max-w-[1200px] p-8"><PageSkeleton /></div>;
  if (me.isError) return <div className="mx-auto max-w-xl p-8"><ErrorState error={me.error} title="We couldn't open your account" onRetry={() => void me.refetch()} /></div>;
  const isAdmin = me.data?.user.role === 'admin';

  if (pathname === '/onboarding') return <ChannelProvider><SyncProvider><main id="main" className="min-h-screen bg-app">{children}</main></SyncProvider></ChannelProvider>;

  return (
    <ChannelProvider>
      <SyncProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
        <Sidebar isAdmin={isAdmin} collapsed={collapsed} onToggle={toggle} />
        <TopBar collapsed={collapsed} />
        <main id="main" className={`min-h-screen pb-24 pt-[72px] transition-[padding] duration-200 lg:pb-12 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[264px]'}`}>
          <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">{children}</div>
        </main>
        <BottomNav isAdmin={isAdmin} />
      </SyncProvider>
    </ChannelProvider>
  );
}
