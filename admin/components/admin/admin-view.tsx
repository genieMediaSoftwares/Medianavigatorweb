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
import { useMe } from '@/lib/hooks/useQueries';
import type { Permission } from '@/types/api';

const TABS = [
  { id: 'system', label: 'Dashboard & health' }, { id: 'users', label: 'Users' }, { id: 'connections', label: 'Social connections' },
  { id: 'sync-runs', label: 'Sync runs' }, { id: 'analytics', label: 'Analytics' }, { id: 'ai', label: 'AI / Gemini' },
  { id: 'credits', label: 'Credits' }, { id: 'errors', label: 'Errors' }, { id: 'audit', label: 'Audit log' }, { id: 'permissions', label: 'Roles & permissions' },
];
const TAB_PERMISSIONS: Record<string, Permission> = { system: 'system.view', users: 'users.view', connections: 'connections.view', 'sync-runs': 'syncruns.view', analytics: 'monitoring.view', ai: 'monitoring.view', credits: 'credits.adjust', errors: 'errors.view', audit: 'audit.view', permissions: 'permissions.view' };

export function AdminView() {
  const router = useRouter();
  const params = useSearchParams();
  const me = useMe();
  const tabs = TABS.filter((item) => me.data?.user.permissions?.includes(TAB_PERMISSIONS[item.id]!));
  const raw = params.get('tab') ?? 'system';
  const tab = tabs.some((t) => t.id === raw) ? raw : tabs[0]?.id;
  return (
    <>
      <PageHeader title="Admin command center" subtitle="One shared backend. Website and mobile app operations in one place." />
      <div className="space-y-6">
        {tab && <TabBar tabs={tabs} value={tab} onChange={(id) => router.replace(`/admin?tab=${id}`, { scroll: false })} label="Admin sections" />}
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
