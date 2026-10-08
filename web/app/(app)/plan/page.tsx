import { Suspense } from 'react';
import { PlanView } from '@/components/plan/plan-view';
import { PageSkeleton } from '@/components/ui/skeleton';

export const metadata = { title: 'Plan · Media Navigator' };

export default function PlanPage() {
  return <Suspense fallback={<PageSkeleton />}><PlanView /></Suspense>;
}
