'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { TabBar } from '@/components/ui/tabs';
import { Ideas } from './ideas';
import { Planner } from './planner';

const TABS = [{ id: 'ideas', label: 'Ideas' }, { id: 'planner', label: 'Planner' }];

export function PlanView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get('tab');
  const tab = raw === 'planner' ? 'planner' : 'ideas';
  return (
    <>
      <PageHeader title="Plan" subtitle="Ideas from your results, and a place to schedule them for yourself." />
      <div className="mb-8"><TabBar label="Plan sections" tabs={TABS} value={tab} onChange={(id) => router.replace(`${pathname}?tab=${id}`, { scroll: false })} /></div>
      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>{tab === 'ideas' ? <Ideas /> : <Planner />}</div>
    </>
  );
}
