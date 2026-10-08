'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { TabBar } from '@/components/ui/tabs';
import { AuditTab } from './audit-tab';
import { ConnectionsTab } from './connections-tab';
import { SyncRunsTab } from './sync-runs-tab';
import { SystemTab } from './system-tab';
import { UsersTab } from './users-tab';

const TABS = [
  { id: 'system', label: 'System' }, { id: 'users', label: 'Users' }, { id: 'connections', label: 'Connected accounts' },
  { id: 'sync-runs', label: 'Sync runs' }, { id: 'audit', label: 'Audit log' },
];

export function AdminView() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('tab') ?? 'system';
  const tab = TABS.some((t) => t.id === raw) ? raw : 'system';
  return (
    <>
      <PageHeader title="Admin console" subtitle="Every action here is recorded in the audit log." />
      <div className="space-y-6">
        <TabBar tabs={TABS} value={tab} onChange={(id) => router.replace(`/admin?tab=${id}`, { scroll: false })} label="Admin sections" />
        <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'system' && <SystemTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'connections' && <ConnectionsTab />}
          {tab === 'sync-runs' && <SyncRunsTab />}
          {tab === 'audit' && <AuditTab />}
        </div>
      </div>
    </>
  );
}
