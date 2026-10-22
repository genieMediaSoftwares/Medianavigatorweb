'use client';

import type { ReactNode } from 'react';
import { useConnections } from '@/lib/hooks/useQueries';
import { LinkButton } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { PageSkeleton } from '@/components/ui/skeleton';

/** Do not mount analytics pages until a real connected channel has been loaded. */
export function ConnectionRequired({ children }: { children: ReactNode }) {
  const connections = useConnections();
  if (connections.isPending) return <PageSkeleton />;
  if (connections.isError) return <ErrorState error={connections.error} onRetry={() => void connections.refetch()} />;
  if (!connections.data?.some(c => c.connected)) return <EmptyState
    title="Connect an account to get your analysis"
    description="Connect Instagram, YouTube, Facebook or LinkedIn to import your posts. Your analytics will appear after the first sync."
    action={<LinkButton href="/connections">Connect an account</LinkButton>}
  />;
  return children;
}
