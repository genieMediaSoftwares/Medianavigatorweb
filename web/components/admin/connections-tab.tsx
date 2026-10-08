'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { timeAgo, whole } from '@/lib/format';
import { platformName } from '@/lib/platforms';
import { infinite, PagedList, statusLabel, statusTone, TableCard, td, th } from './shared';

export function ConnectionsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const q = useInfiniteQuery({ queryKey: ['admin', 'connections'], ...infinite((cursor) => api.adminConnections({ cursor })) });
  const sync = async (id: string) => {
    setBusy(id);
    try {
      const r = await api.adminSyncConnection(id);
      toast.success(r.alreadyQueued ? 'A sync is already waiting for this account' : 'Sync started. This was recorded in the audit log.');
      void qc.invalidateQueries({ queryKey: ['admin'] });
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'We couldn’t start that sync.'); }
    finally { setBusy(null); }
  };
  return (
    <PagedList q={q} empty="No connected accounts yet">
      {(items) => (
        <TableCard>
          <table className="w-full min-w-[900px] border-collapse">
            <thead><tr><th className={th}>Platform</th><th className={th}>Handle</th><th className={th}>Status</th><th className={`${th} text-right`}>Posts</th><th className={th}>Last synced</th><th className={th}>Last error</th><th className={`${th} text-right`}>Action</th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td className={td}>{platformName(c.platform)}</td>
                  <td className={`${td} max-w-[180px] truncate font-semibold text-ink`} title={c.handle}>{c.handle}</td>
                  <td className={td}><Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge></td>
                  <td className={`${td} text-right tabular`}>{whole(c.dataPointsCount)}</td>
                  <td className={td}>{c.lastSyncedAt ? timeAgo(c.lastSyncedAt) : 'Never'}</td>
                  <td className={`${td} max-w-[240px] truncate text-muted`} title={c.lastSyncError ?? undefined}>{c.lastSyncError ?? 'None'}</td>
                  <td className={`${td} text-right`}><Button size="sm" variant="secondary" loading={busy === c.id} disabled={!c.active} onClick={() => void sync(c.id)}>Sync</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </PagedList>
  );
}
