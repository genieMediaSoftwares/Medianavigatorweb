'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { PLATFORM_LABEL } from '@/lib/copy';
import { formatBytes, formatNumber, formatUptime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/Stat';
import { CardsSkeleton, ErrorState } from '@/components/ui/States';
import type { Platform } from '@/types/api';

const yesNo = (on: boolean) => <Badge tone={on ? 'good' : 'neutral'}>{on ? 'Set up' : 'Not set up'}</Badge>;

export function SystemView() {
  const sys = useQuery({ queryKey: qk.admin.system, queryFn: adminApi.system, refetchInterval: 30_000 });
  if (sys.isPending) return <CardsSkeleton count={6} />;
  if (sys.isError) return <ErrorState error={sys.error} onRetry={() => sys.refetch()} />;
  const s = sys.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Database" value={s.database.status === 'connected' ? 'Connected' : 'Down'} meaning={`API up for ${formatUptime(s.app.uptimeSeconds)} (${s.app.environment}, Node ${s.app.node}).`} />
        <StatCard label="Users" value={formatNumber(s.counts.users)} meaning={`${formatNumber(s.counts.activeSessions)} active sessions.`} />
        <StatCard label="Imported posts" value={formatNumber(s.counts.contentItems)} meaning={`${formatNumber(s.counts.aiCacheEntries)} saved AI explanations.`} />
        <StatCard label="Stored files" value={formatNumber(s.storage.files)} meaning={s.storage.configured ? `${formatBytes(s.storage.bytes)} in storage.` : 'File storage is not set up.'} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Integrations" />
          <dl className="divide-y divide-line">
            <div className="flex items-center justify-between gap-3 py-2.5"><dt>AI explanations{s.features.ai.model ? ` (${s.features.ai.model})` : ''}</dt><dd>{yesNo(s.features.ai.configured)}</dd></div>
            <div className="flex items-center justify-between gap-3 py-2.5"><dt>Password-reset email</dt><dd>{yesNo(s.features.email.configured)}</dd></div>
            <div className="flex items-center justify-between gap-3 py-2.5"><dt>File storage</dt><dd>{yesNo(s.storage.configured)}</dd></div>
            <div className="flex items-center justify-between gap-3 py-2.5"><dt>Background sync worker</dt><dd>{yesNo(s.features.syncWorker)}</dd></div>
            <div className="flex items-center justify-between gap-3 py-2.5"><dt>Scheduled syncs</dt><dd>{yesNo(s.features.syncScheduler)}</dd></div>
            {Object.entries(s.features.oauth).map(([p, on]) => (
              <div key={p} className="flex items-center justify-between gap-3 py-2.5"><dt>One-click connect: {PLATFORM_LABEL[p as Platform] ?? p}</dt><dd>{yesNo(on)}</dd></div>
            ))}
          </dl>
        </Card>
        <div className="space-y-6">
          <CountTable title="Connected accounts by status" counts={s.connectedAccountsByStatus} />
          <CountTable title="Sync runs by status" counts={s.syncRunsByStatus} />
        </div>
      </div>
    </div>
  );
}

function CountTable({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  return (
    <Card>
      <CardHeader title={title} />
      {entries.length === 0 ? <p className="text-ink-muted">None yet.</p> : (
        <dl className="divide-y divide-line">
          {entries.map(([k, n]) => (
            <div key={k} className="flex justify-between gap-3 py-2"><dt className="text-ink-muted">{k.replace(/_/g, ' ')}</dt><dd className="font-semibold">{formatNumber(n)}</dd></div>
          ))}
        </dl>
      )}
    </Card>
  );
}
