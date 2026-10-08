import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ConnectionsView } from '@/components/connections/connections-view';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = { title: 'Connections' };

export default function ConnectionsPage() {
  return (
    <>
      <PageHeader title="Connections" subtitle="Link the accounts you want us to look at. We only read; we never post." />
      <Suspense><ConnectionsView /></Suspense>
    </>
  );
}
