'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { timeAgo } from '@/lib/format';
import { AudienceCell, CoverageCell, LastAttemptCell } from './coverage';
import { platformName } from '@/lib/platforms';
import { infinite, PagedList, statusLabel, statusTone, TableCard, td, th } from './shared';
import { PlatformFilter } from './platform-filter';
import { StatusFilter } from './status-filter';
import { UserLink } from './user-link';
import { usePermission } from '@/lib/hooks/useQueries';

export function ConnectionsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const canSync = usePermission('connections.sync');
  const [busy, setBusy] = useState<string | null>(null);
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const q = useInfiniteQuery({ queryKey: ['admin', 'connections', platform, status], ...infinite((cursor) => api.adminConnections({ cursor, platform: platform || undefined, status: status || undefined })) });
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
    <div><PlatformFilter value={platform} onChange={setPlatform} /><StatusFilter value={status} onChange={setStatus} statuses={['connecting', 'syncing', 'sync_complete', 'sync_failed', 'permission_required', 'connection_expired', 'disconnected']} /><PagedList q={q} empty="No connected accounts match this selection">
      {(items) => (
        <TableCard>
          <table className="w-full min-w-[1180px] border-collapse">
            <thead><tr><th className={th}>Customer</th><th className={th}>Platform</th><th className={th}>Handle</th><th className={th}>Status</th><th className={th}>Posts</th><th className={th}>Audience</th><th className={th}>Last success</th><th className={th}>Last attempt</th><th className={th}>Last error</th><th className={`${th} text-right`}>Action</th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td className={td}><UserLink id={c.userId} email={c.ownerEmail} /></td>
                  <td className={td}>{platformName(c.platform)}</td>
                  <td className={`${td} max-w-[180px] truncate font-semibold text-ink`} title={c.handle}>{c.handle}</td>
                  <td className={td}><Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge></td>
                  <td className={td}><CoverageCell c={c} /></td>
                  <td className={td}><AudienceCell c={c} /></td>
                  <td className={td}>{c.lastSyncedAt ? timeAgo(c.lastSyncedAt) : 'Never'}</td>
                  <td className={td}><LastAttemptCell c={c} /></td>
                  <td className={`${td} max-w-[240px] truncate text-muted`} title={c.lastSyncError ?? undefined}>{c.lastSyncError ?? 'None'}</td>
                  <td className={`${td} text-right`}>{canSync && <Button size="sm" variant="secondary" loading={busy === c.id} disabled={!c.active || c.status === 'connection_expired'} onClick={() => void sync(c.id)}>Sync</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </PagedList></div>
  );
}
