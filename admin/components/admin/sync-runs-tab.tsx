'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PlatformFilter } from './platform-filter';
import { StatusFilter } from './status-filter';
import { UserLink } from './user-link';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/endpoints';
import { dateTime, whole } from '@/lib/format';
import { platformName } from '@/lib/platforms';
import { infinite, PagedList, statusLabel, statusTone, TableCard, td, th } from './shared';

const dur = (ms: number | null) => (ms === null ? 'Not finished' : ms < 1000 ? `${ms} ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms / 60000)} min`);

export function SyncRunsTab() {
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const q = useInfiniteQuery({ queryKey: ['admin', 'sync-runs', platform, status], ...infinite((cursor) => api.adminSyncRuns({ cursor, platform: platform || undefined, status: status || undefined })) });
  return (
    <div><PlatformFilter value={platform} onChange={setPlatform} /><StatusFilter value={status} onChange={setStatus} statuses={['queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled']} /><PagedList q={q} empty="No sync runs match this selection">
      {(runs) => (
        <TableCard>
          <table className="w-full min-w-[980px] border-collapse">
            <thead><tr><th className={th}>Customer</th><th className={th}>Requested by</th><th className={th}>Status</th><th className={th}>Platform</th><th className={th}>Type</th><th className={th}>Queued</th><th className={th}>Took</th><th className={th} title="Fetched / new / updated / skipped / failed">Posts (fetched · new · updated · skipped · failed)</th><th className={th}>Error</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className={td}><UserLink id={r.userId} email={r.ownerEmail} /></td>
                  <td className={td}>{r.requestedBy ? <UserLink id={r.requestedBy} email={r.requestedByEmail} /> : 'System'}</td>
                  <td className={td}><Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge></td>
                  <td className={td}>{platformName(r.platform)}</td>
                  <td className={td}>{statusLabel(r.type)}</td>
                  <td className={`${td} whitespace-nowrap`}>{dateTime(r.queuedAt)}</td>
                  <td className={`${td} whitespace-nowrap`}>{dur(r.durationMs)}</td>
                  <td className={`${td} whitespace-nowrap tabular`}>{whole(r.items.fetched)} · {whole(r.items.created)} · {whole(r.items.updated)} · {whole(r.items.skipped)} · {whole(r.items.failed)}</td>
                  <td className={`${td} max-w-[260px] truncate text-muted`} title={r.errorSummary ?? undefined}>{r.errorSummary ?? 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </PagedList></div>
  );
}
