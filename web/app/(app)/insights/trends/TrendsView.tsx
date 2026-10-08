'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp, Minus, LineChart } from 'lucide-react';
import { intelligenceApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { PLATFORM_LABEL, type Tone } from '@/lib/copy';
import { formatChange, formatPercent } from '@/lib/format';
import { useSummary } from '@/lib/hooks';
import { useChannel } from '@/components/providers/AppContext';
import { Sparkline } from '@/components/charts';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { CardsSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import type { HistoryRow, Platform, Trend } from '@/types/api';

/** Plain titles for the API's trend ids; unknown ids keep the API's own name. */
const TREND_TITLE: Record<string, string> = {
  tr_engagement_velocity: 'Engagement on your newest posts',
  tr_format_dominance: 'Your strongest format',
  tr_question_hook: 'Captions that ask a question',
};
const STATUS: Record<Trend['status'], { label: string; tone: Tone; icon: typeof TrendingUp }> = {
  Rising: { label: 'Going up', tone: 'good', icon: TrendingUp },
  Stable: { label: 'Holding steady', tone: 'neutral', icon: Minus },
  'Losing momentum': { label: 'Slowing down', tone: 'warn', icon: TrendingDown },
};

export function TrendsView() {
  const trends = useQuery({ queryKey: qk.trends, queryFn: intelligenceApi.trends });
  const { channel } = useChannel();
  const summary = useSummary(channel, 30);

  return (
    <>
      <PageHeader title="Trends" description="What's rising and what's slowing down in your own content." />
      {trends.isPending ? (
        <CardsSkeleton count={3} />
      ) : trends.isError ? (
        <ErrorState error={trends.error} onRetry={() => trends.refetch()} />
      ) : trends.data.trends.length === 0 ? (
        <EmptyState icon={<LineChart className="size-6" />} title="No trends yet" body="Trends appear once we've imported a few posts to compare over time." action={<ButtonLink href="/connections">Check your channels</ButtonLink>} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {trends.data.trends.map((t) => {
            const st = STATUS[t.status];
            return (
              <li key={t.id}>
                <Card className="h-full">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{TREND_TITLE[t.id] ?? t.name}</h2>
                    <Badge tone={st.tone} icon={<st.icon className="size-3.5" aria-hidden />}>{st.label} · {t.changeRate}</Badge>
                  </div>
                  <p className="mt-2 text-ink-muted">{t.explanation}</p>
                  {t.reasonForRelevance ? <p className="mt-2 text-sm text-ink-subtle">{t.reasonForRelevance}</p> : null}
                  {t.recommendedNextAction ? <p className="mt-3 text-[15px]"><span className="font-semibold">Try next: </span>{t.recommendedNextAction}</p> : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-sm text-ink-subtle">These trends look across all your connected channels.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Rising topics" description="Hashtags whose typical engagement went up in the last 30 days compared with before." />
          {summary.isPending ? <Skeleton className="h-24" /> : summary.isError ? <ErrorState error={summary.error} onRetry={() => summary.refetch()} /> : summary.data.trendingTopics.length === 0 ? (
            <p className="text-ink-muted">No topic is clearly rising yet. A topic needs at least 2 recent and 2 earlier posts to compare.</p>
          ) : (
            <ul className="divide-y divide-line">
              {summary.data.trendingTopics.map((t) => (
                <li key={t.topic} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-semibold">{t.topic}</span>
                  <span className="text-[15px] text-ink-muted">{t.trend !== null ? `${formatChange(t.trend)} · ` : ''}{t.count} posts</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <EngagementSparklines />
      </div>
    </>
  );
}

function EngagementSparklines() {
  const history = useQuery({
    queryKey: qk.history('all', 90),
    queryFn: () => intelligenceApi.history({ from: new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10), limit: 366 }),
  });
  const byPlatform = useMemo(() => {
    const m = new Map<Platform, HistoryRow[]>();
    for (const r of history.data ?? []) m.set(r.platform, [...(m.get(r.platform) ?? []), r]);
    return [...m.entries()].map(([p, rows]) => ({ platform: p, rows: [...rows].sort((a, b) => a.date.localeCompare(b.date)) })).filter((x) => x.rows.length >= 2);
  }, [history.data]);

  return (
    <Card>
      <CardHeader title="Typical engagement over time" description="Recorded after each import over the last 90 days." />
      {history.isPending ? <Skeleton className="h-24" /> : history.isError ? <ErrorState error={history.error} onRetry={() => history.refetch()} /> : byPlatform.length === 0 ? (
        <p className="text-ink-muted">Not enough data yet. This fills in as we record your results on more days.</p>
      ) : (
        <ul className="space-y-4">
          {byPlatform.map(({ platform, rows }) => {
            const first = rows[0].medianEngagementRate;
            const last = rows[rows.length - 1].medianEngagementRate;
            return (
              <li key={platform} className="flex items-center gap-3">
                <PlatformIcon platform={platform} decorative className="size-5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{PLATFORM_LABEL[platform]}</p>
                  <p className="text-sm text-ink-muted">From {formatPercent(first)} to {formatPercent(last)}</p>
                </div>
                <div className="h-10 w-32" aria-hidden><Sparkline data={rows} y="medianEngagementRate" /></div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
