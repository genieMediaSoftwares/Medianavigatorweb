'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Printer } from 'lucide-react';
import { intelligenceApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { PLATFORM_LABEL, formatLabel } from '@/lib/copy';
import { formatCompact, formatDate, formatNumber, formatPercent } from '@/lib/format';
import { connectedOnly, useConnections, useMe, useSummary } from '@/lib/hooks';
import { useChannel } from '@/components/providers/AppContext';
import { AreaTrend, Bars, ChartFrame } from '@/components/charts';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { HelpPopover } from '@/components/ui/Help';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { StatCard } from '@/components/ui/Stat';
import { Segmented } from '@/components/ui/Tabs';
import { CardsSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import type { HistoryRow, Platform, Summary } from '@/types/api';

const PERIODS = [7, 30, 90, 365] as const;
type Period = (typeof PERIODS)[number];
const HISTORY_MAX_ROWS = 366;

export function OverviewView() {
  const { channel } = useChannel();
  const [days, setDays] = useState<Period>(30);
  const connections = useConnections();
  const summary = useSummary(channel, days);
  const scopeLabel = channel === 'all' ? 'all your channels' : PLATFORM_LABEL[channel];

  return (
    <>
      <PageHeader
        title="Overview"
        description={`How ${scopeLabel} did over the last ${days} days, compared with the ${days} days before.`}
        action={<Button variant="secondary" icon={<Printer className="size-4" aria-hidden />} onClick={() => window.print()}>Print report</Button>}
      />
      <div className="print-only mb-4 text-sm">Media Navigator report · {scopeLabel} · last {days} days · printed {formatDate(new Date().toISOString())}</div>
      <div className="no-print mb-6">
        <Segmented label="Period" value={days} onChange={setDays} options={PERIODS.map((d) => ({ value: d, label: d === 365 ? '1 year' : `${d} days` }))} />
      </div>

      {connections.isSuccess && connectedOnly(connections.data).length === 0 ? (
        <EmptyState icon={<BarChart3 className="size-6" />} title="Nothing to show yet" body="Connect a channel and we'll fill this page with your results." action={<ButtonLink href="/connections">Connect a channel</ButtonLink>} />
      ) : summary.isPending ? (
        <CardsSkeleton />
      ) : summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : summary.data.platformsIncluded.length === 0 ? (
        <EmptyState icon={<BarChart3 className="size-6" />} title="No posts imported yet" body="Once your posts are imported, your results appear here." action={<ButtonLink href="/connections">Check import progress</ButtonLink>} />
      ) : (
        <OverviewBody summary={summary.data} channel={channel} days={days} />
      )}
    </>
  );
}

function OverviewBody({ summary: s, channel, days }: { summary: Summary; channel: Platform | 'all'; days: Period }) {
  const cur = s.dataPeriod.current;
  const comparable = s.periodComparison.comparable;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Posts published" value={formatNumber(cur.count)} meaning={`${formatNumber(s.dataPeriod.previous.count)} in the ${days} days before.`} />
        <StatCard
          label="Typical views per post"
          value={cur.count ? formatCompact(cur.medianViews) : '—'}
          change={comparable ? s.periodComparison.viewsMedianChangePct : null}
          meaning={cur.count ? `All posts together: ${formatCompact(cur.totalViews)} views.` : 'No posts in this period.'}
        />
        <StatCard
          label="Typical engagement"
          value={cur.count ? formatPercent(cur.medianEngagementRate) : '—'}
          change={comparable ? s.periodComparison.engagementRateMedianChangePct : null}
          meaning={cur.count ? `The average is ${formatPercent(cur.meanEngagementRate)}; typical is less affected by one unusual post.` : 'No posts in this period.'}
        />
      </div>
      <HelpPopover>
        <p><strong>Typical</strong> is the median: line your posts up from lowest to highest and take the middle one. <strong>Average</strong> adds everything up and divides, so one viral post can pull it a long way.</p>
        <p>Engagement is likes and comments (and shares, where the platform reports them) compared with how many people saw the post.</p>
        <p>Changes are shown only when both periods have at least 3 posts.</p>
      </HelpPopover>

      <ViewsOverTime channel={channel} days={days} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Engagement by format" description="Typical engagement for each kind of post." />
          {s.contentTypePerformance.length === 0 ? (
            <p className="text-ink-muted">Not enough data yet.</p>
          ) : (
            <FormatBars summary={s} channel={channel} />
          )}
        </Card>
        <Card>
          <CardHeader title="Engagement by topic" description="Hashtags you've used on at least 3 posts." />
          {s.topicPerformance.length === 0 ? (
            <p className="text-ink-muted">Not enough data yet. Topics appear once a hashtag is used on 3 or more posts.</p>
          ) : (
            <TopicBars summary={s} />
          )}
        </Card>
      </div>

      {channel === 'all' ? <CompareChannels summary={s} /> : null}
    </div>
  );
}

function ViewsOverTime({ channel, days }: { channel: Platform | 'all'; days: Period }) {
  const tz = useMe().data?.profile?.timezone;
  const history = useQuery({
    queryKey: qk.history(channel, days),
    queryFn: () => {
      const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      return intelligenceApi.history({ platform: channel === 'all' ? undefined : channel, from, limit: HISTORY_MAX_ROWS });
    },
  });
  const series = useMemo(() => aggregate(history.data ?? []), [history.data]);

  return (
    <Card>
      <CardHeader title="Views over time" description="Total views across your imported posts, as recorded after each import." />
      {history.isPending ? (
        <Skeleton className="h-64" />
      ) : history.isError ? (
        <ErrorState error={history.error} onRetry={() => history.refetch()} />
      ) : series.length < 2 ? (
        <p className="py-8 text-center text-ink-muted">Not enough data yet. This chart fills in as we record your totals on more days.</p>
      ) : (
        <>
          <ChartFrame
            summary={`Total views went from ${formatCompact(series[0].views)} on ${formatDate(series[0].date, tz)} to ${formatCompact(series[series.length - 1].views)} on ${formatDate(series[series.length - 1].date, tz)}.`}
            caption="Total views by day"
            rows={series}
            columns={[{ label: 'Day', value: (r) => formatDate(r.date, tz) }, { label: 'Total views', value: (r) => formatNumber(r.views) }]}
          >
            <AreaTrend data={series.map((r) => ({ ...r, label: formatDate(r.date, tz) }))} x="label" y="views" name="Total views" format={formatCompact} />
          </ChartFrame>
          {history.data && history.data.length >= HISTORY_MAX_ROWS ? <p className="mt-2 text-sm text-ink-subtle">Showing the most recent days we could load.</p> : null}
        </>
      )}
    </Card>
  );
}

/** One point per day: the sum of every account's recorded total for that day. */
function aggregate(rows: HistoryRow[]) {
  const byDate = new Map<string, number>();
  for (const r of rows) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.totalViews);
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, views]) => ({ date: `${date}T12:00:00Z`, views }));
}

function FormatBars({ summary: s, channel }: { summary: Summary; channel: Platform | 'all' }) {
  const rows = s.contentTypePerformance.slice(0, 8).map((c) => ({
    label: channel === 'all' ? `${formatLabel(c.contentType)} · ${PLATFORM_LABEL[c.platform as Platform] ?? c.platform}` : formatLabel(c.contentType),
    value: c.medianEngagementRate,
    count: c.count,
  }));
  const top = rows[0];
  return (
    <ChartFrame
      summary={`${top.label} has your best typical engagement at ${formatPercent(top.value)} (${top.count} posts).`}
      caption="Typical engagement by format"
      rows={rows}
      columns={[{ label: 'Format', value: (r) => r.label }, { label: 'Typical engagement', value: (r) => formatPercent(r.value) }, { label: 'Posts', value: (r) => r.count }]}
    >
      <Bars data={rows.map((r) => ({ ...r, label: `${r.label} (${r.count})` }))} x="label" y="value" name="Typical engagement" format={(n) => formatPercent(n)} />
    </ChartFrame>
  );
}

function TopicBars({ summary: s }: { summary: Summary }) {
  const rows = s.topicPerformance.slice(0, 8).map((t) => ({ label: t.topic, value: t.medianEngagementRate, count: t.count }));
  const top = rows[0];
  return (
    <ChartFrame
      summary={`${top.label} has your best typical engagement at ${formatPercent(top.value)} (${top.count} posts).`}
      caption="Typical engagement by topic"
      rows={rows}
      columns={[{ label: 'Topic', value: (r) => r.label }, { label: 'Typical engagement', value: (r) => formatPercent(r.value) }, { label: 'Posts', value: (r) => r.count }]}
    >
      <Bars data={rows.map((r) => ({ ...r, label: `${r.label} (${r.count})` }))} x="label" y="value" name="Typical engagement" format={(n) => formatPercent(n)} />
    </ChartFrame>
  );
}

function CompareChannels({ summary: s }: { summary: Summary }) {
  const rows = s.platformsIncluded.map((p) => ({ platform: p, b: s.baselines[p] })).filter((r) => r.b);
  if (rows.length < 2) return null;
  return (
    <Card>
      <CardHeader title="Compare channels" description="Each connected channel's typical post, across everything we've imported." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(({ platform, b }) => (
          <div key={platform} className="rounded-xl bg-surface-2 p-4">
            <p className="flex items-center gap-2 font-semibold"><PlatformIcon platform={platform} decorative className="size-5" />{PLATFORM_LABEL[platform]}</p>
            <dl className="mt-3 space-y-2 text-[15px]">
              <div className="flex justify-between gap-2"><dt className="text-ink-muted">Typical engagement</dt><dd className="font-semibold">{formatPercent(b.medianEngagementRate)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-muted">Typical views</dt><dd className="font-semibold">{formatCompact(b.medianViews)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-muted">Posts</dt><dd className="font-semibold">{formatNumber(b.sampleSize)}</dd></div>
            </dl>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-subtle">Channels count engagement differently, so use this to see where your effort pays off, not as a strict ranking.</p>
    </Card>
  );
}
