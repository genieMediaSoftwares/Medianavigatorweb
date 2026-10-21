'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Wordmark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import { useMe } from '@/lib/hooks/useQueries';
import { api } from '@/lib/api/endpoints';
import { ApiError, SIGNED_OUT_EVENT } from '@/lib/api/client';
import { isStaffRole } from '../../../shared/admin';
import Link from 'next/link';
import { StepUpProvider } from '@/components/admin/step-up';
export default function Layout({ children }: { children: React.ReactNode }) {
  const me = useMe(); const router = useRouter(); const qc = useQueryClient();
  useEffect(() => {
    const ended = () => { qc.clear(); router.replace('/sign-in'); };
    window.addEventListener(SIGNED_OUT_EVENT, ended);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, ended);
  }, [router, qc]);
  useEffect(() => { if (me.error instanceof ApiError && me.error.status === 401) router.replace('/sign-in'); }, [me.error, router]);
  async function signOut() { try { await api.logout(); } finally { qc.clear(); router.replace('/sign-in'); } }
  return <div className="min-h-dvh"><header className="border-b border-line bg-surface"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-5"><Wordmark href="/admin" /><div className="flex items-center gap-4"><span className="text-sm text-muted">Central administration</span><Link className="text-sm font-semibold text-brand-600 underline underline-offset-4" href="/admin/security">Security</Link><Button variant="secondary" size="sm" onClick={() => void signOut()}>Sign out</Button></div></div></header><main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8">{me.isLoading ? <p role="status">Verifying administrator access…</p> : me.isError ? <ErrorState error={me.error} onRetry={() => void me.refetch()} /> : isStaffRole(me.data?.user.role) ? <StepUpProvider>{children}</StepUpProvider> : <p role="alert">Administrator access is required.</p>}</main></div>;
}
