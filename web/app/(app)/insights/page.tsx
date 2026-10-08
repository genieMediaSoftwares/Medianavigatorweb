import { Suspense } from 'react';
import { InsightsView } from '@/components/insights/insights-view';
import { PageSkeleton } from '@/components/ui/skeleton';

export const metadata = { title: 'Insights · Media Navigator' };

export default function InsightsPage() {
  return <Suspense fallback={<PageSkeleton />}><InsightsView /></Suspense>;
}
