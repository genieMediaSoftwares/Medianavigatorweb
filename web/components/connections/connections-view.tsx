'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock, FileStack, Lock, Plus, RefreshCw, Settings2, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { PlatformTile } from '@/components/ui/platform-logo';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, Notice } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { problemMessage, statusView } from '@/lib/connection-status';
import { compact, timeAgo, whole } from '@/lib/format';
import { useConnections } from '@/lib/hooks/useQueries';
import { useSync } from '@/lib/hooks/useSync';
import { PLATFORM_NAME } from '@/lib/platforms';
import { qk } from '@/lib/queryKeys';
import { PLATFORMS, type Connection, type Platform } from '@/types/api';
import { ConnectModal } from './connect-modal';

const WHAT: Record<Platform, string> = {
  instagram: 'Reels, photo posts and carousels, with views, likes and comments.',
  youtube: 'Videos and Shorts, with views, likes and comments.',
  facebook: 'Page posts and videos, with reactions, comments and shares.',
  linkedin: 'Company Page posts, with the engagement LinkedIn makes available.',
};

function Stat({ icon: Icon, label, children }: { icon: typeof Users; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-app p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</div>
      <div className="mt-1 font-display text-lg font-bold text-ink tabular">{children}</div>
    </div>
  );
}

function OauthBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const result = params.get('oauth');
  if (!result) return null;
  const name = PLATFORM_NAME[params.get('platform') as Platform] ?? 'your account';
  const shown = result === 'connected' ? { tone: 'good' as const, text: `${name} is connected. We’re importing your posts now.` }
    : result === 'denied' ? { tone: 'warn' as const, text: `You cancelled the ${name} sign-in, so nothing was connected.` }
    : { tone: 'bad' as const, text: `We couldn’t finish connecting ${name}. Please try again.` };
  return <Notice tone={shown.tone} className="mb-6"><div className="flex items-center justify-between gap-3"><span>{shown.text}</span><button onClick={() => router.replace('/connections')} className="font-semibold underline">Dismiss</button></div></Notice>;
}

function PlatformCard({ platform, connection, onConnect, onDisconnect }: { platform: Platform; connection?: Connection; onConnect: () => void; onDisconnect: () => void }) {
  const sync = useSync();
  const syncing = sync.active.includes(platform);
  const run = sync.runs[platform];
  const view = statusView(connection, syncing);
  const live = Boolean(connection?.connected);
  const problem = connection ? problemMessage(connection) : null;
  const followers = connection?.accountInfo?.followersCount;

  return (
    <article className="card flex flex-col p-6" aria-label={PLATFORM_NAME[platform]}>
      <div className="flex items-start gap-4">
        <PlatformTile platform={platform} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg">{PLATFORM_NAME[platform]}</h2><Badge tone={view.tone} dot>{view.label}</Badge></div>
          <p className="mt-0.5 truncate text-sm text-muted">{live ? connection?.accountHandle : 'Not connected yet'}</p>
        </div>
      </div>

      {live ? (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-3">
            <Stat icon={FileStack} label="Posts"><dd>{whole(connection?.dataPointsCount ?? 0)}</dd></Stat>
            <Stat icon={Users} label="Followers"><dd>{typeof followers === 'number' ? compact(followers) : 'N/A'}</dd></Stat>
            <Stat icon={Clock} label="Updated"><dd className="text-sm leading-7">{timeAgo(connection?.lastSyncedAt)}</dd></Stat>
          </dl>
          {syncing && (
            <div className="mt-4" role="status" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-brand-100"><div className="h-full w-1/3 animate-pulse rounded-full bg-brand-600" /></div>
              <p className="mt-2 text-[13px] text-muted">{run?.status === 'queued' ? 'Waiting for its turn…' : `Importing your posts${run && run.items.fetched ? ` · ${whole(run.items.fetched)} read so far` : '…'}`}</p>
            </div>
          )}
          {!syncing && run?.status === 'partial' && <Notice tone="warn" className="mt-4">The last update finished, but some posts couldn&apos;t be read{run.items.skipped ? ` (${run.items.skipped} skipped)` : ''}.</Notice>}
          {problem && <p className="mt-4 flex gap-2 rounded-xl bg-warn-bg p-3 text-sm text-warn"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{problem}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
            {view.needsAction
              ? <Button size="sm" onClick={onConnect}>Reconnect</Button>
              : <Button size="sm" variant="secondary" disabled={syncing} onClick={() => void sync.start(platform)}><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />Sync now</Button>}
            <Button size="sm" variant="ghost" onClick={onDisconnect}><Settings2 className="h-4 w-4" aria-hidden="true" />Disconnect</Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-5 flex-1 text-[15px] text-muted">{WHAT[platform]}</p>
          <Button className="mt-5 self-start" onClick={onConnect}><Plus className="h-4 w-4" aria-hidden="true" />Connect {PLATFORM_NAME[platform]}</Button>
        </>
      )}
    </article>
  );
}

export function ConnectionsView() {
  const { data, isLoading, error, refetch } = useConnections({ refetchOnMount: 'always' });
  const sync = useSync();
  const qc = useQueryClient();
  const toast = useToast();
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [disconnecting, setDisconnecting] = useState<Platform | null>(null);
  const by = (p: Platform) => data?.find((c) => c.platform === p);
  const liveCount = (data ?? []).filter((c) => c.connected).length;

  if (isLoading) return <div className="grid gap-6 lg:grid-cols-2">{PLATFORMS.map((p) => <Skeleton key={p} className="h-64 rounded-2xl" />)}</div>;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <OauthBanner />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-muted"><strong className="font-bold text-ink">{liveCount} of {PLATFORMS.length}</strong> channels connected. Updates run in the background.</p>
        <Button variant="secondary" disabled={liveCount === 0 || sync.active.length > 0} onClick={() => void sync.start('all')}><RefreshCw className={`h-4 w-4 ${sync.active.length ? 'animate-spin' : ''}`} aria-hidden="true" />Sync all</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {PLATFORMS.map((p) => <PlatformCard key={p} platform={p} connection={by(p)} onConnect={() => setConnecting(p)} onDisconnect={() => setDisconnecting(p)} />)}
      </div>
      <div className="mt-8 flex gap-3 rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        <p><strong className="text-ink">How access works.</strong> Media Navigator only reads, so it can&apos;t post, edit or delete anything on your accounts. Your access is encrypted and deleted when you disconnect. Your past results stay unless you delete your account in Settings.</p>
      </div>

      {connecting && <ConnectModal platform={connecting} connection={by(connecting)} open onOpenChange={(o) => !o && setConnecting(null)} />}
      <ConfirmDialog open={disconnecting !== null} onOpenChange={(o) => !o && setDisconnecting(null)} title={`Disconnect ${disconnecting ? PLATFORM_NAME[disconnecting] : ''}?`}
        message="We’ll delete the saved access. Your past results stay." confirmLabel="Disconnect"
        onConfirm={async () => {
          if (!disconnecting) return;
          try { await api.disconnect(disconnecting); await qc.invalidateQueries({ queryKey: qk.connections }); toast.success(`${PLATFORM_NAME[disconnecting]} was disconnected.`); }
          catch (e) { toast.error(e instanceof ApiError ? e.message : 'We couldn’t disconnect that account.'); }
        }} />
    </div>
  );
}
