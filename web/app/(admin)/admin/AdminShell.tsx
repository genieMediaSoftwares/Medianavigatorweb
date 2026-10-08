'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useMe } from '@/lib/hooks';
import { Logo } from '@/components/layout/Logo';
import { ApiBanner } from '@/components/layout/ApiBanner';
import { ButtonLink } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { CardsSkeleton, EmptyState, ErrorState } from '@/components/ui/States';

const TABS = [
  { href: '/admin', label: 'System' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/connections', label: 'Connected accounts' },
  { href: '/admin/sync-runs', label: 'Sync runs' },
  { href: '/admin/audit-logs', label: 'Audit log' },
];

/**
 * Admin console. The role check here only decides what to render; the API enforces the admin role on every /admin
 * request, so nothing here is trusted for authorization.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const me = useMe();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo compact />
            <span className="font-display text-xl font-semibold">Admin</span>
          </div>
          <Link href="/home" className="inline-flex min-h-11 items-center gap-2 font-semibold text-action hover:underline">
            <ArrowLeft className="size-4" aria-hidden /> Back to app
          </Link>
        </div>
      </header>
      <ApiBanner />
      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {me.isPending ? (
          <CardsSkeleton />
        ) : me.isError ? (
          <ErrorState error={me.error} onRetry={() => me.refetch()} />
        ) : me.data.user.role !== 'admin' ? (
          <EmptyState icon={<ShieldAlert className="size-6" />} title="This area is for administrators" body="Your account doesn't have access to the admin console." action={<ButtonLink href="/home">Back to app</ButtonLink>} />
        ) : (
          <>
            <Tabs label="Admin sections" items={TABS.map((t) => ({ ...t, active: t.href === '/admin' ? path === '/admin' : path.startsWith(t.href) }))} />
            <p className="mb-4 text-sm text-ink-subtle">Every change you make here is recorded in the audit log. Admins never see users&apos; access tokens.</p>
            {children}
          </>
        )}
      </main>
    </div>
  );
}
