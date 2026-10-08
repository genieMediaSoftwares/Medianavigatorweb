import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RouteLoading } from '@/components/layout/RouteStates';
import { PlannerView } from './PlannerView';

export const metadata: Metadata = { title: 'Planner' };

export default function PlannerPage() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <PlannerView />
    </Suspense>
  );
}
