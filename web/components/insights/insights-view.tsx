'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TabBar } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { Overview } from './overview';
import { Trends } from './trends';
import { Patterns } from './patterns';
import { Ask } from './ask';

const TABS = [{ id: 'overview', label: 'Overview' }, { id: 'trends', label: 'Trends' }, { id: 'patterns', label: 'Patterns' }, { id: 'ask', label: 'Ask' }];

export function InsightsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get('tab') ?? 'overview';
  const tab = TABS.some((t) => t.id === raw) ? raw : 'overview';
  return (
    <>
      <PageHeader title="Insights" subtitle="What your numbers say, in plain words." />
      <div className="no-print mb-8"><TabBar label="Insights sections" tabs={TABS} value={tab} onChange={(id) => router.replace(`${pathname}?tab=${id}`, { scroll: false })} /></div>
      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'overview' && <Overview />}
        {tab === 'trends' && <Trends />}
        {tab === 'patterns' && <Patterns />}
        {tab === 'ask' && <Ask />}
      </div>
    </>
  );
}
