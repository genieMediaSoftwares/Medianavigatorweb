import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RouteLoading } from '@/components/layout/RouteStates';
import { ConnectionsView } from './ConnectionsView';

export const metadata: Metadata = { title: 'Connections' };

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <ConnectionsView />
    </Suspense>
  );
}
