'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiError, markLeavingSession, setSignedOutHandler } from '@/lib/api/client';
import { ToastProvider } from '@/components/ui/Toast';
import { reachability } from './reachability';

/** Retries only failures that can succeed on a second try: network problems and 5xx. Never 4xx (401/403/422 …). */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof ApiError) return error.unreachable || error.status >= 500;
  return false;
}

function makeClient() {
  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.unreachable) reachability.set(false);
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError, onSuccess: () => reachability.set(true) }),
    mutationCache: new MutationCache({ onError, onSuccess: () => reachability.set(true) }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);

  useEffect(() => {
    // The server already tried to refresh; a 401 now means the session is over everywhere in the app. One full page
    // load drops everything from the old session; later 401s from requests still in flight are ignored.
    setSignedOutHandler(() => {
      markLeavingSession();
      window.location.replace(new URL('/signed-out', window.location.origin).href);
    });
    return () => setSignedOutHandler(null);
  }, []);

  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
