'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, Eye, FileText, Printer, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AreaTrend, BarCompare } from '@/components/charts';
import { PlatformTile } from '@/components/ui/platform-logo';
import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { HelpPopover } from '@/components/ui/help';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { StatCard } from '@/components/ui/stat-card';
import { Segmented } from '@/components/ui/tabs';
import { Skeleton, StatRowSkeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api/endpoints';
import { compact, percent, timeAgo, whole } from '@/lib/format';
import { useChannel } from '@/lib/hooks/useChannel';
import { useConnections, useSummary } from '@/lib/hooks/useQueries';
import { platformName, typeLabel } from '@/lib/platforms';
import { qk } from '@/lib/queryKeys';
import type { HistoryPoint, Platform, Summary } from '@/types/api';

const PERIODS = [{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }, { value: 365, label: '1 year' }];

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Daily snapshots hold running totals per account. Add the accounts up per day, carrying each one's last known total forward. */
export function buildViewsSeries(points: HistoryPoint[], days: number): Array<{ label: string; value: number }> {
  const byPlatform = new Map<string, Map<string, number>>();
  const dates = new Set<string>();
  for (const p of points) {
    const v = num(p.totalViews);
    if (v === null || typeof p.date !== 'string') continue;
    const key = p.platform ?? 'all';
    if (!byPlatform.has(key)) byPlatform.set(key, new Map());
    byPlatform.get(key)!.set(p.date, v);
    dates.add(p.date);
  }
  const sorted = [...dates].sort();
  const last = new Map<string, number>();
  const out = sorted.map((d) => {
    for (const [k, m] of byPlatform) { const v = m.get(d); if (v !== undefined) last.set(k, v); }
    let total = 0;
    last.forEach((v) => { total += v; });
    return { date: d, value: total };
  });
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return out.filter((p) => p.date >= cutoff).map((p) => ({ label: new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(new Date(`${p.date}T00:00:00Z`)), value: p.value }));
}

function pctChange(cur: number, prev: number, comparable: boolean): number | null {
  if (!comparable || prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

export function Overview() {
  const { channel, setChannel } = useChannel();
  const [days, setDays] = useState(30);
  const summary = useSummary(channel, days);
  const connections = useConnections();
  const history = useQuery({ queryKey: qk.history(channel), queryFn: () => api.history({ platform: channel === 'all' ? undefined : channel, limit: 366 }), staleTime: 60_000 });

  const liveChannels = (connections.data ?? []).filter((c) => c.connected);
  const series = useMemo(() => buildViewsSeries(history.data ?? [], days), [history.data, days]);

  return (
    <div className="space-y-8">
      <div className="hidden print:block">
        <h2 className="text-2xl">Media Navigator report</h2>
        <p className="mt-1 text-sm">{channel === 'all' ? 'All channels' : platformName(channel)} · last {days} days · {new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date())}</p>
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="Time period" value={days} onChange={setDays} options={PERIODS} />
          {liveChannels.length > 0 && (
            <label className="flex items-center gap-2 lg:hidden">
              <span className="sr-only">Channel</span>
              <select value={channel} onChange={(e) => setChannel(e.target.value as Platform | 'all')} className="h-11 rounded-xl border border-line-strong bg-surface px-3 text-sm font-semibold text-ink">
                <option value="all">All channels</option>
                {liveChannels.map((c) => <option key={c.platform} value={c.platform}>{platformName(c.platform)}</option>)}
              </select>
            </label>
          )}
        </div>
        <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" />Print report</Button>
      </div>

      {summary.isPending ? (
        <div className="space-y-8"><StatRowSkeleton /><Skeleton className="h-72" /></div>
      ) : summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : summary.data.dataPeriod.current.count === 0 && summary.data.contentTypePerformance.length === 0 ? (
        <EmptyState icon={<BarChart3 className="h-7 w-7" />} title="No posts in this period yet" description="Try a longer time period, or sync your channels so we can read your latest posts." />
      ) : (
        <Loaded summary={summary.data} days={days} series={series} historyPending={history.isPending} historyError={history.isError} onRetryHistory={() => history.refetch()} followers={Object.fromEntries((connections.data ?? []).filter((c) => c.connected).map((c) => [c.platform, c.accountInfo?.followersCount ?? null]))} connectedPlatforms={connections.data ? liveChannels.map((c) => c.platform) : null} />
      )}
    </div>
  );
}

function Loaded({ summary, days, series, historyPending, historyError, onRetryHistory, followers, connectedPlatforms }: {
  summary: Summary; days: number; series: Array<{ label: string; value: number }>; historyPending: boolean; historyError: boolean; onRetryHistory: () => void;
  followers: Record<string, number | null>; connectedPlatforms: Platform[] | null;
}) {
  const { current, previous } = summary.dataPeriod;
  const comparable = summary.periodComparison.comparable;
  const multi = summary.platformsIncluded.length > 1;

  const formatRows = [...summary.contentTypePerformance].sort((a, b) => b.medianEngagementRate - a.medianEngagementRate).map((f) => ({
    label: multi ? `${typeLabel(f.contentType)} · ${platformName(f.platform)}` : typeLabel(f.contentType),
    value: f.medianEngagementRate, display: percent(f.medianEngagementRate, 2), note: `${f.count} ${f.count === 1 ? 'post' : 'posts'}`,
  }));
  const topicRows = [...summary.topicPerformance].sort((a, b) => b.medianEngagementRate - a.medianEngagementRate || b.count - a.count).slice(0, 6).map((t) => ({
    label: t.topic, value: t.medianEngagementRate, display: percent(t.medianEngagementRate, 2), note: `${t.count} ${t.count === 1 ? 'post' : 'posts'}`,
  }));
  const bestFormat = formatRows[0];
  const formatSummary = bestFormat ? `${bestFormat.label} posts get ${bestFormat.display} typical engagement, the highest of your formats. Each row shows how many posts it is based on.` : '';
  const topicSummary = topicRows[0] ? `${topicRows[0].label} has the highest typical engagement at ${topicRows[0].display}, based on ${topicRows[0].note}.` : '';

  const channels = summary.platformsIncluded.filter((p) => !connectedPlatforms || connectedPlatforms.includes(p));
  const first = series[0];
  const last = series[series.length - 1];

  return (
    <>
      <section aria-labelledby="stats-h" className="space-y-4">
        <div className="flex items-center gap-1">
          <h2 id="stats-h" className="text-xl">At a glance</h2>
          <HelpPopover label="What does typical mean?">
            <p>&ldquo;Typical&rdquo; is the middle value of your posts (the median): half your posts did better, half did worse. It is not thrown off by one post that went unusually well, which is why we use it instead of the average.</p>
          </HelpPopover>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCard label="Posts" icon={<FileText className="h-5 w-5" />} value={whole(current.count)} delta={pctChange(current.count, previous.count, comparable)} meaning={`Published in the last ${days} days.`} />
          <StatCard label="Views" icon={<Eye className="h-5 w-5" />} value={compact(current.totalViews)} delta={pctChange(current.totalViews, previous.totalViews, comparable)} meaning="Total views on those posts." />
          <StatCard label="Typical engagement" icon={<TrendingUp className="h-5 w-5" />} value={percent(current.medianEngagementRate, 2)} delta={comparable ? summary.periodComparison.engagementRateMedianChangePct : null} meaning="How much a typical post gets liked, commented on or shared." />
        </div>
        <p className="text-sm text-muted">{comparable ? 'Changes compare with the period before.' : 'We can’t compare with the period before yet, because there aren’t enough earlier posts.'} Updated {timeAgo(summary.lastSyncedAt)}.</p>
      </section>

      <Card>
        <SectionHeader title="Views over time" description="Total views across your posts, one point per day we synced." />
        {historyPending ? <Skeleton className="h-64" /> : historyError ? <ErrorState title="We couldn’t load the history" error={null} onRetry={onRetryHistory} /> : series.length < 3 || !first || !last ? (
          <div className="rounded-xl border border-dashed border-line-strong px-5 py-8 text-center">
            <p className="font-semibold text-ink">Not enough data yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">We save a snapshot each time your channels sync. After a few more syncs, your views over time will appear here.</p>
          </div>
        ) : (
          <AreaTrend caption="Total views over time" valueLabel="Views" data={series}
            summary={`Total views went from ${compact(first.value)} on ${first.label} to ${compact(last.value)} on ${last.label}.`} />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader title="By format" description="Which kinds of posts get the most reaction." />
          {formatRows.length ? <BarCompare caption="Typical engagement by format" summary={formatSummary} rows={formatRows} valueLabel="Typical engagement" noteLabel="Based on" /> : <p className="text-sm text-muted">Not enough posts yet to compare formats.</p>}
        </Card>
        <Card>
          <SectionHeader title="By topic" description="Topics (hashtags) your audience reacts to." />
          {topicRows.length ? <BarCompare caption="Typical engagement by topic" summary={topicSummary} rows={topicRows} valueLabel="Typical engagement" noteLabel="Based on" /> : <p className="text-sm text-muted">No topics found in your captions yet.</p>}
        </Card>
      </div>

      <section>
        <SectionHeader title="Compare channels" description="Only channels you have connected." />
        {channels.length === 0 ? <p className="text-sm text-muted">Connect a channel to compare them here.</p> : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {channels.map((p) => {
              const posts = summary.contentTypePerformance.filter((c) => c.platform === p).reduce((s, c) => s + c.count, 0);
              const base = summary.baselines[p];
              const f = followers[p];
              return (
                <Card key={p} className="p-5">
                  <div className="mb-4 flex items-center gap-3"><PlatformTile platform={p} size="sm" /><h3 className="text-lg">{platformName(p)}</h3></div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <Metric label="Posts" value={whole(posts)} />
                    <Metric label="Typical engagement" value={base ? percent(base.medianEngagementRate, 2) : 'Not enough data yet'} />
                    <Metric label="Typical views" value={base ? compact(base.medianViews) : 'Not enough data yet'} />
                    <Metric label="Followers" value={f === null || f === undefined ? 'Not available' : compact(f)} />
                  </dl>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-muted">{label}</dt><dd className="font-display text-lg font-bold text-ink tabular">{value}</dd></div>;
}
