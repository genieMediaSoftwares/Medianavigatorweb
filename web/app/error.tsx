'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { ApiUnreachableBanner, isUnreachable } from '@/components/system/api-unreachable';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-app px-4 py-12 text-center">
      {isUnreachable(error) ? <div className="w-full max-w-xl"><ApiUnreachableBanner onRetry={reset} /></div> : (
        <>
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-bad-bg text-bad"><AlertTriangle className="h-8 w-8" aria-hidden="true" /></div>
          <h1 className="text-[28px] sm:text-[32px]">Something went wrong</h1>
          <p className="mt-2 max-w-md text-[15px] text-muted">We hit a problem showing this page. Your data is safe. Please try again.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={reset}>Try again</Button>
            <LinkButton href="/home" variant="secondary">Go to Home</LinkButton>
          </div>
          {error.digest && <p className="mt-6 text-xs text-subtle">Reference: <span className="font-mono">{error.digest}</span></p>}
        </>
      )}
    </main>
  );
}
