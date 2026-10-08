'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { PLATFORMS } from '@/lib/api/schemas';
import { CONNECTION_STATUS, PLATFORM_LABEL } from '@/lib/copy';
import { timeAgo } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FilterSelect } from '@/components/ui/Field';
import { errorMessage } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { AdminTable, PAGE_SIZE, usePaged } from '../AdminTable';
import type { ConnectionStatus, Platform } from '@/types/api';

const STATUSES = ['syncing', 'sync_complete', 'sync_failed', 'permission_required', 'connection_expired', 'disconnected'] as const;

export function AccountsView() {
  const client = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState('');
  const accounts = usePaged(qk.admin.connections(status, platform), (cursor) =>
    adminApi.connections({ cursor, limit: PAGE_SIZE, status: status || undefined, platform: (platform || undefined) as Platform | undefined }));
  const sync = useMutation({
    mutationFn: adminApi.syncConnection,
    onSuccess: (r) => {
      void client.invalidateQueries({ queryKey: ['admin'] });
      toast(r.alreadyQueued ? 'A sync was already queued for this account.' : 'Sync queued. This is in the audit log.');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <FilterSelect label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </FilterSelect>
        <FilterSelect label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">Any platform</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
        </FilterSelect>
      </div>
      <AdminTable
        query={accounts}
        caption="Connected accounts"
        empty="No connected accounts match."
        rowKey={(a) => a.id}
        columns={[
          { label: 'Account', cell: (a) => <><span className="font-semibold">{a.handle}</span><span className="block text-sm text-ink-muted">{PLATFORM_LABEL[a.platform]} · user {a.userId}</span></> },
          { label: 'Status', cell: (a) => { const s = CONNECTION_STATUS[a.status as ConnectionStatus]; return <Badge tone={s?.tone ?? 'neutral'}>{s?.label ?? a.status.replace(/_/g, ' ')}</Badge>; } },
          { label: 'Last sync', cell: (a) => timeAgo(a.lastSyncedAt) ?? 'Never' },
          { label: 'Posts', cell: (a) => a.dataPointsCount },
          { label: 'Last error', cell: (a) => a.lastSyncError ? <span className="text-sm text-bad-fg">{a.lastSyncError}</span> : <span className="text-sm text-ink-subtle">None</span> },
          { label: 'Action', cell: (a) => a.active ? <Button size="sm" variant="secondary" loading={sync.isPending && sync.variables === a.id} onClick={() => sync.mutate(a.id)}>Sync</Button> : <span className="text-sm text-ink-subtle">Disconnected</span> },
        ]}
      />
    </>
  );
}
