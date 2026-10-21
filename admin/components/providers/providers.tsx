'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { shouldRetry } from '@/lib/hooks/useQueries';
import { ToastProvider } from '@/components/ui/toast';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, retryDelay: (n) => Math.min(1000 * 2 ** n, 8000), refetchOnWindowFocus: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  }));
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
