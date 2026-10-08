'use client';

import { ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useMe } from '@/lib/hooks/useQueries';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const me = useMe();
  const isAdmin = me.data?.user.role === 'admin';
  return (
    <div className="min-h-dvh bg-app">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3"><Wordmark href="/home" /><Badge tone="brand">Admin</Badge></div>
          <LinkButton href="/home" variant="secondary" size="sm">Back to app</LinkButton>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        {me.isLoading && <div className="space-y-6" aria-busy="true"><Skeleton className="h-10 w-64" /><Skeleton className="h-11 w-full" /><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></div>}
        {me.isError && <ErrorState error={me.error} onRetry={() => void me.refetch()} />}
        {me.data && !isAdmin && <EmptyState icon={<ShieldAlert className="h-7 w-7" />} title="This area is for administrators" description="Your account doesn’t have access to the admin console." action={<LinkButton href="/home">Go to Home</LinkButton>} />}
        {isAdmin && children}
      </main>
    </div>
  );
}
