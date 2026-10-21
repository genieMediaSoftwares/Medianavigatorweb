'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { TabBar } from '@/components/ui/tabs';
import { AuditTab } from './audit-tab';
import { ConnectionsTab } from './connections-tab';
import { SyncRunsTab } from './sync-runs-tab';
import { SystemTab } from './system-tab';
import { UsersTab } from './users-tab';
import { ErrorsTab, MonitoringTab, PermissionsTab } from './monitoring-tab';

const TABS = [
  { id: 'system', label: 'Dashboard & health' }, { id: 'users', label: 'Users' }, { id: 'connections', label: 'Social connections' },
  { id: 'sync-runs', label: 'Sync runs' }, { id: 'analytics', label: 'Analytics' }, { id: 'ai', label: 'AI / Gemini' },
  { id: 'credits', label: 'Credits' }, { id: 'errors', label: 'Errors' }, { id: 'audit', label: 'Audit log' }, { id: 'permissions', label: 'Roles & permissions' },
];

export function AdminView() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('tab') ?? 'system';
  const tab = TABS.some((t) => t.id === raw) ? raw : 'system';
  return (
    <>
      <PageHeader title="Admin command center" subtitle="One shared backend. Website and mobile app operations in one place." />
      <div className="space-y-6">
        <TabBar tabs={TABS} value={tab} onChange={(id) => router.replace(`/admin?tab=${id}`, { scroll: false })} label="Admin sections" />
        <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'system' && <SystemTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'connections' && <ConnectionsTab />}
          {tab === 'sync-runs' && <SyncRunsTab />}
          {tab === 'audit' && <AuditTab />}
          {(tab === 'ai' || tab === 'analytics' || tab === 'credits') && <MonitoringTab section={tab} />}
          {tab === 'errors' && <ErrorsTab />}
          {tab === 'permissions' && <PermissionsTab />}
        </div>
      </div>
    </>
  );
}
