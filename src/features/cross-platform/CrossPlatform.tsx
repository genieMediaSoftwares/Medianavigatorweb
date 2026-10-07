import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api } from '../../services/api';
import { NormalizedMedia, PlatformType } from '../../types';
import { PlatformConnectModal } from '../../components/modals/PlatformConnectModal';
import { EmptyState } from '../../components/common/EmptyState';
import { InstagramLogo, YouTubeLogo, FacebookLogo, LinkedInLogo } from '../../components/common/PlatformLogos';
import { BarList, PageSkeleton, Section, compact, platformName, typeLabel } from '../../components/ui';

const LOGO: Record<PlatformType, React.ReactNode> = { instagram: <InstagramLogo size="md" />, youtube: <YouTubeLogo size="md" />, facebook: <FacebookLogo size="md" />, linkedin: <LinkedInLogo size="md" /> };
const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export const CrossPlatform: React.FC = () => {
  const { setCurrentTab, setSelectedPlatform, connections, refreshConnections } = useMedia();
  const [media, setMedia] = useState<NormalizedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectFor, setConnectFor] = useState<PlatformType | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    api.getMedia().then(setMedia).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [connections]);

  const rows = useMemo(() => connections.filter((c) => c.connected).map((c) => {
    const posts = media.filter((m) => m.platform === c.platform);
    const byType = new Map<string, number[]>();
    posts.forEach((p) => byType.set(p.contentType, [...(byType.get(p.contentType) ?? []), p.engagementRate]));
    const best = [...byType.entries()].filter(([, v]) => v.length >= 3).map(([t, v]) => ({ t, m: median(v) })).sort((a, b) => b.m - a.m)[0];
    return { c, count: posts.length, views: posts.reduce((a, p) => a + p.views, 0), medEng: median(posts.map((p) => p.engagementRate)), medViews: median(posts.map((p) => p.views)), best };
  }), [connections, media]);

  if (loading && media.length === 0) return <PageSkeleton />;
  if (error) return <EmptyState type="no_data" title="We couldn’t load the comparison" description={error} actionText="Try again" onAction={() => window.location.reload()} />;
  if (rows.length === 0) return <EmptyState type="no_connection" title="Connect a channel to compare" description="Add at least one account. The comparison gets more useful with two or more." actionText="Go to connections" onAction={() => setCurrentTab('connections')} />;

  const missing = (['instagram', 'youtube', 'facebook', 'linkedin'] as PlatformType[]).filter((p) => !rows.some((r) => r.c.platform === p));

  return (
    <div className="space-y-8 max-w-5xl">
      <div className={`grid grid-cols-1 ${rows.length > 1 ? 'md:grid-cols-2' : ''} gap-5`}>
        {rows.map((r) => (
          <article key={r.c.platform} className="card p-6">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-canvas-soft flex items-center justify-center">{LOGO[r.c.platform]}</span>
              <div className="min-w-0 flex-1"><h3 className="font-bold">{platformName(r.c.platform)}</h3><p className="text-sm text-muted truncate">{r.c.accountHandle}</p></div>
              <button onClick={() => { setSelectedPlatform(r.c.platform); setCurrentTab('content'); }} className="text-sm font-semibold text-brand-700 hover:underline">View posts</button>
            </div>
            {r.count === 0 ? <p className="mt-5 text-sm text-muted">Connected, but no posts have been imported yet.</p> : (
              <dl className="mt-5 grid grid-cols-2 gap-4">
                <div><dt className="text-sm text-muted">Posts</dt><dd className="font-display text-3xl tabular">{r.count}</dd></div>
                <div><dt className="text-sm text-muted">Followers</dt><dd className="font-display text-3xl tabular">{r.c.accountInfo?.followersCount != null ? compact(r.c.accountInfo.followersCount) : '—'}</dd></div>
                <div><dt className="text-sm text-muted">Typical engagement</dt><dd className="font-display text-3xl tabular text-brand-700">{r.medEng.toFixed(1)}%</dd></div>
                <div><dt className="text-sm text-muted">Typical views</dt><dd className="font-display text-3xl tabular">{compact(r.medViews)}</dd></div>
                <div className="col-span-2 text-sm text-body pt-3 border-t border-line">{r.best ? <>Best format: <span className="font-semibold text-ink">{typeLabel(r.best.t)}</span> at {r.best.m.toFixed(1)}%</> : 'Not enough posts per format to name a best one.'}</div>
              </dl>
            )}
          </article>
        ))}
      </div>

      {rows.filter((r) => r.count > 0).length > 1 && (
        <Section title="Side by side" description="Typical (median) engagement rate per platform. Platforms measure engagement differently, so compare trends, not exact values.">
          <div className="card p-6"><BarList rows={[...rows].filter((r) => r.count > 0).sort((a, b) => b.medEng - a.medEng).map((r) => ({ key: r.c.platform, label: platformName(r.c.platform), value: r.medEng, valueLabel: `${r.medEng.toFixed(1)}%`, sub: `${r.count} posts · typical views ${compact(r.medViews)}` }))} /></div>
        </Section>
      )}

      {missing.length > 0 && (
        <Section title="Not connected">
          <div className="flex flex-wrap gap-3">{missing.map((p) => <button key={p} onClick={() => setConnectFor(p)} className="btn btn-secondary"><Plus className="w-4 h-4" />Add {platformName(p)}</button>)}</div>
        </Section>
      )}

      {connectFor && <PlatformConnectModal platform={connectFor} connection={connections.find((c) => c.platform === connectFor)} onClose={() => setConnectFor(null)} onSuccess={() => refreshConnections()} />}
    </div>
  );
};
