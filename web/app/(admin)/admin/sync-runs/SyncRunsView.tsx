'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { PLATFORMS, SYNC_RUN_STATUSES } from '@/lib/api/schemas';
import { PLATFORM_LABEL, SYNC_RUN_STATUS } from '@/lib/copy';
import { formatDateTime, formatDuration } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { FilterSelect } from '@/components/ui/Field';
import { AdminTable, PAGE_SIZE, usePaged } from '../AdminTable';
import type { Platform } from '@/types/api';

export function SyncRunsView() {
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState('');
  const runs = usePaged(qk.admin.syncRuns(status, platform), (cursor) =>
    adminApi.syncRuns({ cursor, limit: PAGE_SIZE, status: status || undefined, platform: (platform || undefined) as Platform | undefined }));

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <FilterSelect label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {SYNC_RUN_STATUSES.map((s) => <option key={s} value={s}>{SYNC_RUN_STATUS[s].label}</option>)}
        </FilterSelect>
        <FilterSelect label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">Any platform</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
        </FilterSelect>
      </div>
      <AdminTable
        query={runs}
        caption="Sync runs"
        empty="No sync runs match."
        rowKey={(r) => r.id}
        columns={[
          { label: 'Queued', cell: (r) => <>{formatDateTime(r.queuedAt)}<span className="block text-sm text-ink-muted">{PLATFORM_LABEL[r.platform]} · {r.type}</span></> },
          { label: 'Status', cell: (r) => <Badge tone={SYNC_RUN_STATUS[r.status].tone}>{SYNC_RUN_STATUS[r.status].label}</Badge> },
          { label: 'Duration', cell: (r) => (r.durationMs !== null ? formatDuration(r.durationMs / 1000) : '—') },
          { label: 'Items', cell: (r) => <span className="text-sm">{r.items.fetched} found · {r.items.created} new · {r.items.updated} updated{r.items.failed ? ` · ${r.items.failed} failed` : ''}</span> },
          { label: 'Attempts', cell: (r) => r.attempts },
          { label: 'Error', cell: (r) => r.errorSummary ? <span className="text-sm text-bad-fg">{r.errorKind ? `${r.errorKind}: ` : ''}{r.errorSummary}</span> : <span className="text-sm text-ink-subtle">None</span> },
        ]}
      />
    </>
  );
}
