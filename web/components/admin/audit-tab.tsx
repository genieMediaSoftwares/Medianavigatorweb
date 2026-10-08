'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { dateTime } from '@/lib/format';
import { infinite, PagedList, TableCard, td, th } from './shared';

const mono = 'font-mono text-[13px]';

export function AuditTab() {
  const q = useInfiniteQuery({ queryKey: ['admin', 'audit'], ...infinite((cursor) => api.adminAudit({ cursor })) });
  return (
    <PagedList q={q} empty="Nothing has been recorded yet">
      {(rows) => (
        <TableCard>
          <table className="w-full min-w-[860px] border-collapse">
            <thead><tr><th className={th}>When</th><th className={th}>Action</th><th className={th}>Actor</th><th className={th}>Target</th><th className={th}>Request</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className={`${td} whitespace-nowrap`}>{dateTime(a.createdAt)}</td>
                  <td className={`${td} font-semibold text-ink`}>{a.action}</td>
                  <td className={`${td} ${mono}`}>{a.actorId ?? 'System'}</td>
                  <td className={`${td} ${mono}`}>{a.targetType ? `${a.targetType}${a.targetId ? `:${a.targetId}` : ''}` : 'None'}</td>
                  <td className={`${td} ${mono}`}>{a.requestId ?? 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </PagedList>
  );
}
