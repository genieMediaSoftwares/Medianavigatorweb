'use client';

import { useDeferredValue, useState } from 'react';
import { adminApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { formatDateTime } from '@/lib/format';
import { AdminTable, PAGE_SIZE, usePaged } from '../AdminTable';

export function AuditView() {
  const [action, setAction] = useState('');
  const term = useDeferredValue(action.trim());
  const log = usePaged(qk.admin.audit(term), (cursor) => adminApi.audit({ cursor, limit: PAGE_SIZE, action: term || undefined }));

  return (
    <>
      <label className="mb-4 flex max-w-md flex-col gap-1 text-sm font-semibold text-ink-muted">
        Filter by action (exact, e.g. user.role_change)
        <input value={action} onChange={(e) => setAction(e.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-[16px] font-normal text-ink" />
      </label>
      <AdminTable
        query={log}
        caption="Audit log"
        empty="No audit entries match."
        rowKey={(e) => e.id}
        columns={[
          { label: 'When', cell: (e) => formatDateTime(e.createdAt) },
          { label: 'Action', cell: (e) => <code className="text-sm">{e.action}</code> },
          { label: 'Actor', cell: (e) => <span className="text-sm">{e.actorId ?? 'System'}</span> },
          { label: 'Target', cell: (e) => <span className="text-sm">{e.targetType ? `${e.targetType} ${e.targetId ?? ''}` : '—'}</span> },
          { label: 'Request id', cell: (e) => <span className="text-xs text-ink-muted">{e.requestId ?? '—'}</span> },
        ]}
      />
    </>
  );
}
