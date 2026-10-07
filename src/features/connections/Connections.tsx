import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Clock, Plus, RefreshCw, Settings2, Users, FileStack, CheckCircle2 } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { PlatformType, PlatformConnection } from '../../types';
import { PlatformConnectModal } from '../../components/modals/PlatformConnectModal';
import { InstagramLogo, YouTubeLogo, FacebookLogo, LinkedInLogo } from '../../components/common/PlatformLogos';
import { Badge, compact, timeAgo } from '../../components/ui';

const PLATFORMS: PlatformType[] = ['instagram', 'youtube', 'facebook', 'linkedin'];

const INFO: Record<PlatformType, { name: string; logo: React.ReactNode; what: string }> = {
  instagram: { name: 'Instagram', logo: <InstagramLogo size="lg" />, what: 'Reels, posts and carousels, with reach, saves and views where Instagram provides them.' },
  youtube: { name: 'YouTube', logo: <YouTubeLogo size="lg" />, what: 'Videos and Shorts with views, likes and comments.' },
  facebook: { name: 'Facebook', logo: <FacebookLogo size="lg" />, what: 'Page posts and videos with reactions, comments and shares.' },
  linkedin: { name: 'LinkedIn', logo: <LinkedInLogo size="lg" />, what: 'Company page posts with the engagement LinkedIn makes available.' },
};

const statusBadge = (c: PlatformConnection) => {
  switch (c.status) {
    case 'sync_complete': return <Badge tone="success" dot>Connected</Badge>;
    case 'syncing': case 'connecting': return <Badge tone="brand" dot>Syncing</Badge>;
    case 'sync_failed': return <Badge tone="danger" dot>Sync failed</Badge>;
    case 'permission_required': return <Badge tone="warning" dot>Needs permission</Badge>;
    case 'connection_expired': return <Badge tone="danger" dot>Reconnect needed</Badge>;
    default: return <Badge tone="neutral">Not connected</Badge>;
  }
};

export const Connections: React.FC = () => {
  const { connections, refreshConnections, startSyncFlow, syncState } = useMedia();
  const [modal, setModal] = useState<PlatformType | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const onSynced = () => refreshConnections();
    window.addEventListener('media-synced', onSynced);
    return () => window.removeEventListener('media-synced', onSynced);
  }, [refreshConnections]);

  // Result of the provider sign-in redirect (?oauth=connected|denied|failed&platform=…)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const result = q.get('oauth'); const p = q.get('platform');
    if (!result) return;
    const name = INFO[p as PlatformType]?.name ?? 'your account';
    setNotice(result === 'connected'
      ? { tone: 'success', text: `${name} is connected. We’re importing your posts now.` }
      : { tone: 'error', text: result === 'denied' ? `You cancelled the ${name} sign-in. Nothing was connected.` : `We couldn’t finish connecting ${name}. Please try again.` });
    q.delete('oauth'); q.delete('platform');
    window.history.replaceState({}, '', `${window.location.pathname}${q.toString() ? `?${q}` : ''}`);
    refreshConnections();
  }, [refreshConnections]);

  const byPlatform = (p: PlatformType) => connections.find((c) => c.platform === p);
  const liveCount = connections.filter((c) => c.connected).length;

  return (
    <div className="space-y-6">
      {notice && (
        <div role="status" className={`rounded-2xl border p-4 text-sm flex items-center gap-3 ${notice.tone === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'}`}>
          {notice.tone === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[15px] text-body"><span className="font-bold text-ink">{liveCount} of 4</span> channels connected. Syncing runs in the background and refreshes your numbers.</p>
        <button onClick={() => startSyncFlow('all')} disabled={liveCount === 0 || syncState.isSyncing} className="btn btn-secondary self-start">
          <RefreshCw className={`w-4 h-4 ${syncState.isSyncing ? 'animate-spin' : ''}`} />Sync all
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {PLATFORMS.map((p) => {
          const c = byPlatform(p);
          const live = Boolean(c?.connected);
          const trouble = live && c && ['connection_expired', 'permission_required', 'sync_failed'].includes(c.status);
          return (
            <article key={p} className="card p-6 flex flex-col">
              <div className="flex items-start gap-4">
                <span className="w-14 h-14 rounded-2xl bg-canvas-soft flex items-center justify-center shrink-0">{INFO[p].logo}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold">{INFO[p].name}</h3>
                    {c && statusBadge(c)}
                  </div>
                  <p className="text-sm text-muted mt-0.5 truncate">{live ? c!.accountHandle : 'Not connected'}</p>
                </div>
              </div>

              {live ? (
                <>
                  <dl className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-canvas p-3"><dt className="text-xs text-muted flex items-center gap-1"><FileStack className="w-3.5 h-3.5" />Posts</dt><dd className="mt-1 font-display text-2xl tabular">{c!.dataPointsCount}</dd></div>
                    <div className="rounded-xl bg-canvas p-3"><dt className="text-xs text-muted flex items-center gap-1"><Users className="w-3.5 h-3.5" />Followers</dt><dd className="mt-1 font-display text-2xl tabular">{c!.accountInfo?.followersCount != null ? compact(c!.accountInfo.followersCount) : '—'}</dd></div>
                    <div className="rounded-xl bg-canvas p-3"><dt className="text-xs text-muted flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Synced</dt><dd className="mt-1 text-sm font-semibold leading-8">{timeAgo(c!.lastSyncedAt)}</dd></div>
                  </dl>
                  {trouble && (
                    <p className="mt-4 text-sm rounded-xl bg-amber-50 border border-amber-100 text-amber-900 p-3 flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />{c!.statusMessage}</p>
                  )}
                  <div className="mt-5 pt-5 border-t border-line flex flex-wrap items-center gap-2">
                    {trouble && c!.status !== 'sync_failed'
                      ? <button onClick={() => setModal(p)} className="btn btn-primary btn-sm">Reconnect</button>
                      : <button onClick={() => startSyncFlow(p, c!.accountHandle)} disabled={syncState.isSyncing} className="btn btn-secondary btn-sm"><RefreshCw className="w-4 h-4" />Sync now</button>}
                    <button onClick={() => setModal(p)} className="btn btn-ghost btn-sm"><Settings2 className="w-4 h-4" />Manage</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-5 text-sm text-body leading-relaxed flex-1">{INFO[p].what}</p>
                  <button onClick={() => setModal(p)} className="btn btn-primary mt-5 self-start"><Plus className="w-4 h-4" />Connect {INFO[p].name}</button>
                </>
              )}
            </article>
          );
        })}
      </div>

      <div className="card-flat p-5 text-sm text-body bg-canvas-soft/60 flex gap-3">
        <ArrowRight className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <p><span className="font-semibold text-ink">How access works.</span> We only ask for read permissions, so Media Navigator can’t post, edit or delete anything on your accounts. Access tokens are encrypted on our server and deleted when you disconnect. Disconnecting keeps your past results; you can delete them by deleting your account in Settings.</p>
      </div>

      {modal && (
        <PlatformConnectModal platform={modal} connection={byPlatform(modal)} onClose={() => setModal(null)} onSuccess={() => refreshConnections()} />
      )}
    </div>
  );
};
