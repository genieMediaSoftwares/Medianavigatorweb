import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye, Heart, Layers, Plus, RefreshCw, Sparkles, TrendingUp, Trophy, TriangleAlert, FileStack } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api, OverviewData } from '../../services/api';
import { PlatformType, PlatformConnection } from '../../types';
import { PlatformConnectModal } from '../../components/modals/PlatformConnectModal';
import { InstagramLogo, YouTubeLogo, FacebookLogo, LinkedInLogo } from '../../components/common/PlatformLogos';
import { Badge, Delta, Section, Segmented, StatCard, PageSkeleton, timeAgo, compact } from '../../components/ui';

const PLATFORMS: PlatformType[] = ['instagram', 'youtube', 'facebook', 'linkedin'];

const PLATFORM_META: Record<PlatformType, { name: string; logo: React.ReactNode; blurb: string }> = {
  instagram: { name: 'Instagram', logo: <InstagramLogo size="md" />, blurb: 'Reels, posts and carousels' },
  youtube: { name: 'YouTube', logo: <YouTubeLogo size="md" />, blurb: 'Videos and Shorts' },
  facebook: { name: 'Facebook', logo: <FacebookLogo size="md" />, blurb: 'Page posts and videos' },
  linkedin: { name: 'LinkedIn', logo: <LinkedInLogo size="md" />, blurb: 'Company page posts' },
};

type Summary = {
  dataPeriod: { days: number; current: { count: number; medianEngagementRate: number; totalViews: number; medianViews: number }; previous: { count: number; medianEngagementRate: number } };
  periodComparison: { engagementRateMedianChangePct: number | null; viewsMedianChangePct: number | null; comparable: boolean };
  contentTypePerformance: Array<{ platform: string; contentType: string; count: number; medianEngagementRate: number }>;
  topContent: Array<{ id: string; title: string; platform: string; contentType: string; engagementRate: number; views: number; vsMedianEngagementPct: number | null }>;
  needsImprovement: Array<{ id: string; title: string; platform: string; contentType: string; engagementRate: number; views: number; vsMedianEngagementPct: number | null }>;
  platformsIncluded: string[];
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const STATUS_BADGE: Record<string, { tone: 'success' | 'warning' | 'danger' | 'neutral' | 'brand'; label: string }> = {
  sync_complete: { tone: 'success', label: 'Up to date' },
  syncing: { tone: 'brand', label: 'Syncing' },
  connecting: { tone: 'brand', label: 'Connecting' },
  sync_failed: { tone: 'danger', label: 'Sync failed' },
  permission_required: { tone: 'warning', label: 'Needs permission' },
  connection_expired: { tone: 'danger', label: 'Reconnect needed' },
  not_connected: { tone: 'neutral', label: 'Not connected' },
};

export const Overview: React.FC = () => {
  const { setCurrentTab, setSelectedPlatform, connections, refreshConnections, startSyncFlow, user, setActiveMedia } = useMedia();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectPlatform, setConnectPlatform] = useState<PlatformType | null>(null);

  const load = () => {
    setError(null);
    Promise.all([api.getOverview(), api.getSummary({ days: Number(days) })])
      .then(([o, s]) => { setOverview(o); setSummary(s); })
      .catch((e: Error) => setError(e.message || 'Could not load your overview.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days, connections]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener('media-synced', h);
    return () => window.removeEventListener('media-synced', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const byPlatform = useMemo(() => Object.fromEntries(PLATFORMS.map((p) => [p, connections.find((c) => c.platform === p)])) as Record<PlatformType, PlatformConnection | undefined>, [connections]);
  const connected = PLATFORMS.filter((p) => byPlatform[p]?.connected);
  const firstName = (user.fullName || '').split(' ')[0];

  if (loading && !overview) return <PageSkeleton />;

  if (error && !overview) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto">
        <TriangleAlert className="w-8 h-8 text-amber-500 mx-auto" />
        <h3 className="mt-3 text-lg font-bold">We couldn’t load your overview</h3>
        <p className="mt-1 text-sm text-body">{error}</p>
        <button onClick={() => { setLoading(true); load(); }} className="btn btn-primary mt-5"><RefreshCw className="w-4 h-4" />Try again</button>
      </div>
    );
  }

  // ---------- First run: nothing connected ----------
  if (connected.length === 0) {
    return (
      <div className="space-y-8">
        <div className="card relative overflow-hidden p-8 md:p-12">
          <div aria-hidden="true" className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-brand-100/70 blur-3xl" />
          <div className="relative max-w-2xl">
            <Badge tone="brand">Step 1 of 2 · Connect an account</Badge>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05]">
              {firstName ? `Welcome, ${firstName}.` : 'Welcome.'} Let’s find out what’s working.
            </h2>
            <p className="mt-4 text-lg text-body leading-relaxed">
              Connect a social account and Media Navigator will pull in your posts, compare each one with your own history, and show you what to repeat and what to fix.
            </p>
          </div>
        </div>

        <Section title="Choose a platform" description="You can add the others any time.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => setConnectPlatform(p)} className="card card-interactive p-5 flex items-center gap-4 text-left">
                <span className="w-12 h-12 rounded-2xl bg-canvas-soft flex items-center justify-center shrink-0">{PLATFORM_META[p].logo}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-ink">{PLATFORM_META[p].name}</span>
                  <span className="block text-sm text-muted">{PLATFORM_META[p].blurb}</span>
                </span>
                <span className="btn btn-secondary btn-sm"><Plus className="w-4 h-4" />Connect</span>
              </button>
            ))}
          </div>
        </Section>

        {connectPlatform && (
          <PlatformConnectModal platform={connectPlatform} connection={byPlatform[connectPlatform]} onClose={() => setConnectPlatform(null)}
            onSuccess={async () => { await refreshConnections(); load(); }} />
        )}
      </div>
    );
  }

  const hasData = Boolean(overview?.hasData && summary && summary.dataPeriod.current.count + summary.dataPeriod.previous.count >= 0 && (summary.topContent.length + summary.needsImprovement.length > 0 || summary.contentTypePerformance.length > 0));
  const bestFormat = summary?.contentTypePerformance.find((c) => c.count >= 3) ?? summary?.contentTypePerformance[0];
  const cur = summary?.dataPeriod.current;
  const cmp = summary?.periodComparison;

  return (
    <div className="space-y-8">
      {/* Greeting + headline */}
      <div className="card relative overflow-hidden p-6 md:p-8">
        <div aria-hidden="true" className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="relative">
          <div className="max-w-3xl">
            <div className="eyebrow">{greeting()}{firstName ? `, ${firstName}` : ''}</div>
            <h2 className="mt-2 font-display text-3xl md:text-[40px] font-medium tracking-tight leading-[1.1] text-ink">
              {overview?.hero.heading}
            </h2>
            <p className="mt-3 text-[15px] text-body leading-relaxed">{overview?.hero.summary}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={() => startSyncFlow('all')} className="btn btn-primary"><RefreshCw className="w-4 h-4" />Sync now</button>
            <button onClick={() => setCurrentTab('intelligence')} className="btn btn-secondary"><Sparkles className="w-4 h-4 text-brand-600" />Ask the AI</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {hasData && summary && cur && (
        <section aria-label="Key numbers">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold tracking-tight">Performance</h3>
            <Segmented ariaLabel="Period" value={days} onChange={setDays} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={<FileStack className="w-[18px] h-[18px]" />} label="Posts published" value={cur.count} hint={cmp?.comparable ? `vs ${summary.dataPeriod.previous.count} before` : `in the last ${days} days`} />
            <StatCard icon={<Eye className="w-[18px] h-[18px]" />} label="Views" value={compact(cur.totalViews)} hint={`typical post: ${compact(cur.medianViews)}`} delta={cmp?.comparable ? cmp.viewsMedianChangePct : null} />
            <StatCard icon={<Heart className="w-[18px] h-[18px]" />} label="Typical engagement" value={`${cur.medianEngagementRate.toFixed(1)}%`} hint="median per post" delta={cmp?.comparable ? cmp.engagementRateMedianChangePct : null} />
            <StatCard icon={<Layers className="w-[18px] h-[18px]" />} label="Strongest format" value={<span className="capitalize">{bestFormat ? bestFormat.contentType : '—'}</span>} hint={bestFormat ? `${bestFormat.medianEngagementRate.toFixed(1)}% median on ${bestFormat.platform}` : 'Needs more posts'} />
          </div>
          {!cmp?.comparable && <p className="mt-3 text-sm text-muted">Change versus the previous period appears once both periods have at least 3 posts.</p>}
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Signals */}
          {overview && overview.signals.length > 0 && (
            <Section title="What to know right now" description="Short takeaways computed from your synced posts.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overview.signals.map((s) => (
                  <article key={s.id} className="card p-5 flex flex-col">
                    <div className="flex items-center gap-2 text-sm font-semibold text-brand-700"><span aria-hidden="true">{s.icon}</span>{s.category}</div>
                    <h4 className="mt-2 text-base font-bold leading-snug text-ink">{s.title}</h4>
                    <p className="mt-1.5 text-sm text-body leading-relaxed flex-1">{s.description}</p>
                    <button onClick={() => setCurrentTab(s.actionTarget as never)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 self-start">
                      {s.actionText}<ArrowRight className="w-4 h-4" />
                    </button>
                  </article>
                ))}
              </div>
            </Section>
          )}

          {/* Top + needs attention */}
          {summary && (summary.topContent.length > 0 || summary.needsImprovement.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([['Top posts', 'top_performers', summary.topContent, Trophy, 'text-emerald-600 bg-emerald-50'], ['Needs attention', 'bottom_performers', summary.needsImprovement, TriangleAlert, 'text-amber-600 bg-amber-50']] as const).map(([title, tab, items, Icon, tint]) => (
                <div key={title} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold flex items-center gap-2"><span className={`w-8 h-8 rounded-lg flex items-center justify-center ${tint}`}><Icon className="w-4 h-4" /></span>{title}</h3>
                    <button onClick={() => setCurrentTab(tab)} className="text-sm font-semibold text-brand-700 hover:underline">See all</button>
                  </div>
                  {items.length === 0 ? <p className="text-sm text-muted py-4">Nothing here yet. This fills in once you have at least 5 posts on a platform.</p> : (
                    <ul className="divide-y divide-line">
                      {items.slice(0, 3).map((p) => (
                        <li key={p.id}>
                          <button onClick={async () => { try { setActiveMedia(await api.getMediaById(p.id)); } catch { setCurrentTab('content'); } }} className="w-full text-left py-3 flex items-center gap-3 hover:bg-canvas rounded-lg -mx-2 px-2 transition-colors">
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-ink truncate">{p.title}</span>
                              <span className="block text-xs text-muted capitalize">{p.platform} · {p.contentType} · {compact(p.views)} views</span>
                            </span>
                            <span className="text-right shrink-0">
                              <span className="block text-sm font-bold tabular">{p.engagementRate.toFixed(1)}%</span>
                              {p.vsMedianEngagementPct !== null && <Delta value={p.vsMedianEngagementPct} />}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Observations */}
          {overview && overview.observations.length > 0 && (
            <Section title="Baselines by platform">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overview.observations.map((o) => (
                  <article key={o.id} className="card p-5">
                    <div className="flex items-center gap-2 font-bold"><span aria-hidden="true">{o.icon}</span>{o.title.replace(/ Performance Baseline/i, '')}</div>
                    <p className="mt-2 text-sm text-body leading-relaxed">{o.explanation}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-muted">Analysed</dt><dd className="font-semibold">{o.details.trend}</dd></div>
                      <div><dt className="text-muted">Reach</dt><dd className="font-semibold">{o.details.impact}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Channels */}
        <aside className="space-y-4" aria-label="Connected channels">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-tight">Channels</h3>
            <button onClick={() => setCurrentTab('connections')} className="text-sm font-semibold text-brand-700 hover:underline">Manage</button>
          </div>
          <ul className="space-y-3">
            {PLATFORMS.map((p) => {
              const c = byPlatform[p];
              const live = Boolean(c?.connected);
              const st = STATUS_BADGE[c?.status ?? 'not_connected'] ?? STATUS_BADGE.not_connected;
              return (
                <li key={p} className="card p-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-canvas-soft flex items-center justify-center shrink-0">{PLATFORM_META[p].logo}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink truncate">{live ? c!.accountHandle : PLATFORM_META[p].name}</div>
                      <div className="text-xs text-muted">{live ? `${c!.dataPointsCount} posts · synced ${timeAgo(c!.lastSyncedAt)}` : 'Not connected'}</div>
                    </div>
                    {live ? <Badge tone={st.tone} dot>{st.label}</Badge> : (
                      <button onClick={() => setConnectPlatform(p)} className="btn btn-secondary btn-sm"><Plus className="w-4 h-4" />Connect</button>
                    )}
                  </div>
                  {live && (c!.status === 'connection_expired' || c!.status === 'permission_required' || c!.status === 'sync_failed') && (
                    <button onClick={() => setConnectPlatform(p)} className="mt-3 w-full btn btn-secondary btn-sm">{c!.status === 'sync_failed' ? 'Review' : 'Reconnect'}</button>
                  )}
                  {live && (
                    <button onClick={() => { setSelectedPlatform(p); setCurrentTab('content'); }} className="mt-3 text-sm font-semibold text-brand-700 hover:underline inline-flex items-center gap-1">
                      View posts<ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="card-flat p-4 flex gap-3 text-sm text-body bg-brand-50/60 border-brand-100">
            <TrendingUp className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <p>Numbers update when a sync completes. Last synced times are shown on each channel.</p>
          </div>
        </aside>
      </div>

      {connectPlatform && (
        <PlatformConnectModal platform={connectPlatform} connection={byPlatform[connectPlatform]} onClose={() => setConnectPlatform(null)}
          onSuccess={async () => { await refreshConnections(); load(); }} />
      )}
    </div>
  );
};
