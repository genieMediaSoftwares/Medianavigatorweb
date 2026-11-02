'use client';

import { useQuery } from '@tanstack/react-query';
import { Database, FileText, FileStack, Users, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, SectionHeader } from '@/components/ui/card';
import { Skeleton, StatRowSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { StatCard } from '@/components/ui/stat-card';
import { ApiUnreachableBanner, isUnreachable } from '@/components/system/api-unreachable';
import { api } from '@/lib/api/endpoints';
import { bytes, whole } from '@/lib/format';

import { statusLabel, statusTone } from './shared';

function uptime(s: number): string {
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hour${h === 1 ? '' : 's'}`;
  return `${Math.floor(h / 24)} days`;
}

function Counts({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-muted">{title}</p>
      <div className="flex flex-wrap gap-2">
        {entries.length === 0 ? <span className="text-sm text-subtle">None yet</span> : entries.map(([k, v]) => <Badge key={k} tone={statusTone(k)}>{statusLabel(k)} · {whole(v)}</Badge>)}
      </div>
    </div>
  );
}

export function SystemTab() {
  const q = useQuery({ queryKey: ['admin', 'system'], queryFn: api.adminSystem, refetchInterval: 60_000 });
  if (q.isLoading) return <div className="space-y-6"><StatRowSkeleton count={4} /><Skeleton className="h-64" /></div>;
  if (q.isError) return isUnreachable(q.error) ? <ApiUnreachableBanner onRetry={() => void q.refetch()} /> : <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const s = q.data;
  if (!s) return null;
  const dbOk = s.database.status === 'ok' || s.database.status === 'up' || s.database.status === 'connected';
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={whole(s.counts.users)} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active sessions" value={whole(s.counts.activeSessions)} icon={<Wifi className="h-5 w-5" />} />
        <StatCard label="Stored posts" value={whole(s.counts.contentItems)} icon={<FileStack className="h-5 w-5" />} />
        <StatCard label="Files" value={whole(s.storage.files)} meaning={s.storage.configured ? `${bytes(s.storage.bytes)} stored` : 'File storage isn’t set up'} icon={<FileText className="h-5 w-5" />} />
      </div>
      <Card className="space-y-6">
        <SectionHeader title="Service configuration" />
        <div className="flex flex-wrap gap-3"><Badge tone={s.features.ai.configured ? 'good' : 'warn'}>Gemini: {s.features.ai.configured ? s.features.ai.model : 'not configured'}</Badge><Badge tone={s.features.email.configured ? 'good' : 'warn'}>Email: {s.features.email.configured ? 'configured' : 'not configured'}</Badge><Badge tone={s.features.syncWorker ? 'good' : 'warn'}>Sync worker: {s.features.syncWorker ? 'enabled' : 'disabled'}</Badge><Badge tone={s.features.syncScheduler ? 'good' : 'warn'}>Scheduler: {s.features.syncScheduler ? 'enabled' : 'disabled'}</Badge>{Object.entries(s.features.oauth).map(([platform, configured]) => <Badge key={platform} tone={configured ? 'good' : 'warn'}>{platform}: {configured ? 'configured' : 'not configured'}</Badge>)}</div>
        <p className="text-sm text-muted">Configuration flags indicate settings, not a live provider connectivity check. This dashboard refreshes every minute.</p>
        {s.features.email.provider && <p className="text-sm text-muted">Password-reset email provider: {s.features.email.provider}. Live delivery and domain verification must be tested separately.</p>}
        {s.configurationChecks && <div className="space-y-3"><h3 className="font-semibold">Shared backend configuration</h3><p className="text-sm text-muted">These settings apply to the website, Android and iOS through the same API. They do not certify a release.</p><div className="flex flex-wrap gap-3">{s.configurationChecks.map(check => <Badge key={check.id} tone={check.ready ? 'good' : 'warn'}>{check.label}: {check.ready ? 'set' : 'required'}</Badge>)}</div></div>}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[15px]">
          <span className="flex items-center gap-2"><Database className="h-5 w-5 text-brand-600" aria-hidden="true" /><span className="font-semibold text-ink">Database</span><Badge tone={dbOk ? 'good' : 'bad'} dot>{statusLabel(s.database.status)}</Badge></span>
          <span><span className="font-semibold text-ink">Running for</span> <span className="text-muted">{uptime(s.app.uptimeSeconds)}</span></span>
          <span className="text-muted">{statusLabel(s.app.environment)} · Node {s.app.node}</span>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Counts title="Connected accounts by status" data={s.connectedAccountsByStatus} />
          <Counts title="Sync runs by status" data={s.syncRunsByStatus} />
        </div>
      </Card>
    </div>
  );
}
