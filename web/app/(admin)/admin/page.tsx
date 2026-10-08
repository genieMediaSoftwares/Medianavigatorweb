import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminView } from '@/components/admin/admin-view';
import { PageSkeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Admin' };

export default function AdminPage() {
  return <Suspense fallback={<PageSkeleton />}><AdminView /></Suspense>;
}
