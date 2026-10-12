'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Ask } from '@/components/insights/ask';
import { PageHeader } from '@/components/ui/page-header';
import { TabBar } from '@/components/ui/tabs';
import { RankedPosts } from './ranked-posts';
import { AuditReport, ExecutiveReport } from './reports';

const TABS = [
  { id: 'audit', label: 'Full audit' }, { id: 'working', label: 'What’s working' }, { id: 'attention', label: 'Needs attention' },
  { id: 'executive', label: 'Executive insights' }, { id: 'ask', label: 'Ask a question' },
];

export function IntelligenceHub() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get('tab') ?? 'audit';
  const tab = TABS.some((t) => t.id === raw) ? raw : 'audit';
  return (
    <>
      <PageHeader title="AI Intelligence" subtitle="An AI reads your measured numbers and explains what is working, what is not, and what to try next." />
      <div className="no-print mb-8"><TabBar label="AI Intelligence sections" tabs={TABS} value={tab} onChange={(id) => router.replace(`${pathname}?tab=${id}`, { scroll: false })} /></div>
      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'audit' && <AuditReport />}
        {tab === 'working' && <RankedPosts mode="top" />}
        {tab === 'attention' && <RankedPosts mode="low" />}
        {tab === 'executive' && <ExecutiveReport />}
        {tab === 'ask' && <Ask />}
      </div>
    </>
  );
}
