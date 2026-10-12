import { Suspense } from 'react';
import { IntelligenceHub } from '@/components/intelligence/hub';
import { PageSkeleton } from '@/components/ui/skeleton';

export const metadata = { title: 'AI Intelligence · Media Navigator' };

export default function InsightsPage() {
  return <Suspense fallback={<PageSkeleton />}><IntelligenceHub /></Suspense>;
}
