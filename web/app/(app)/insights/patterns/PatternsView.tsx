'use client';

import { useQuery } from '@tanstack/react-query';
import { Puzzle } from 'lucide-react';
import { intelligenceApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { PLATFORM_LABEL, formatLabel } from '@/lib/copy';
import { formatChange, formatPercent, pctChange } from '@/lib/format';
import { useSummary } from '@/lib/hooks';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { HelpPopover } from '@/components/ui/Help';
import { CardsSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import type { Archive, Platform, Summary } from '@/types/api';

/** A pattern is only shown when both sides of the comparison have at least this many posts. */
const MIN_POSTS = 3;

interface Pattern { id: string; title: string; detail: string; change: number; basedOn: string; kind: 'average' | 'typical' }

function buildPatterns(archive: Archive, summary: Summary): Pattern[] {
  const out: Pattern[] = [];
  const q = archive.captionAnalysis.questionHook;
  if (q.countWithQuestion >= MIN_POSTS && q.countWithoutQuestion >= MIN_POSTS) {
    const c = pctChange(q.avgEngagementWithQuestion, q.avgEngagementWithoutQuestion);
    if (c !== null) out.push({
      id: 'question', title: 'Asking a question in the caption',
      detail: `Posts with a question averaged ${formatPercent(q.avgEngagementWithQuestion)} engagement; posts without one averaged ${formatPercent(q.avgEngagementWithoutQuestion)}.`,
      change: c, basedOn: `${q.countWithQuestion} with a question, ${q.countWithoutQuestion} without`, kind: 'average',
    });
  }
  const l = archive.captionAnalysis.captionLength;
  if (l.shortCount >= MIN_POSTS && l.longCount >= MIN_POSTS) {
    const c = pctChange(l.shortAvgEngagement, l.longAvgEngagement);
    if (c !== null) out.push({
      id: 'length', title: 'Short captions (under 120 characters)',
      detail: `Short captions averaged ${formatPercent(l.shortAvgEngagement)} engagement; longer ones averaged ${formatPercent(l.longAvgEngagement)}.`,
      change: c, basedOn: `${l.shortCount} short, ${l.longCount} longer`, kind: 'average',
    });
  }
  for (const f of summary.contentTypePerformance) {
    const base = summary.baselines[f.platform];
    if (f.count < MIN_POSTS || !base || base.sampleSize - f.count < MIN_POSTS) continue;
    const c = pctChange(f.medianEngagementRate, base.medianEngagementRate);
    if (c === null) continue;
    const platform = PLATFORM_LABEL[f.platform as Platform] ?? f.platform;
    out.push({
      id: `format-${f.platform}-${f.contentType}`, title: `${formatLabel(f.contentType)}s on ${platform}`,
      detail: `Typical engagement ${formatPercent(f.medianEngagementRate)}, against ${formatPercent(base.medianEngagementRate)} for all your ${platform} posts.`,
      change: c, basedOn: `${f.count} of ${base.sampleSize} ${platform} posts`, kind: 'typical',
    });
  }
  return out.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

export function PatternsView() {
  const archive = useQuery({ queryKey: qk.archive, queryFn: intelligenceApi.archive });
  const summary = useSummary('all', 30);

  const pending = archive.isPending || summary.isPending;
  const error = archive.error ?? summary.error;

  return (
    <>
      <PageHeader
        title="Patterns"
        description="Repeatable habits in your posts and how they compare with your usual."
        action={
          <HelpPopover>
            <p>Each pattern compares two groups of your own posts. Caption patterns compare averages; format patterns compare the typical (median) post on the same channel.</p>
            <p>We hide a pattern unless both groups have at least {MIN_POSTS} posts. A pattern is a lead to test, not proof of cause.</p>
          </HelpPopover>
        }
      />
      {pending ? (
        <CardsSkeleton count={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => { void archive.refetch(); void summary.refetch(); }} />
      ) : (
        <PatternList patterns={buildPatterns(archive.data!, summary.data!)} topics={summary.data!.topicPerformance} />
      )}
    </>
  );
}

function PatternList({ patterns, topics }: { patterns: Pattern[]; topics: Summary['topicPerformance'] }) {
  if (patterns.length === 0 && topics.length === 0) {
    return (
      <EmptyState
        icon={<Puzzle className="size-6" />}
        title="No clear patterns yet"
        body={`We need at least ${MIN_POSTS} posts on each side of a comparison. Keep posting and syncing and patterns will appear here.`}
        action={<ButtonLink href="/posts" variant="secondary">See your posts</ButtonLink>}
      />
    );
  }
  return (
    <div className="space-y-6">
      {patterns.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {patterns.map((p) => {
            const better = p.change >= 0.5;
            const worse = p.change <= -0.5;
            return (
              <li key={p.id}>
                <Card className="h-full">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-semibold">{p.title}</h2>
                    <Badge tone={better ? 'good' : worse ? 'warn' : 'neutral'}>
                      {better ? `${formatChange(p.change)} better` : worse ? `${formatChange(Math.abs(p.change)).replace('+', '')} worse` : 'About the same'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[15px] text-ink-muted">{p.detail}</p>
                  <p className="mt-2 text-sm text-ink-subtle">Based on {p.basedOn} ({p.kind === 'average' ? 'averages' : 'typical post'}).</p>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
      {topics.length ? (
        <Card>
          <h2 className="font-semibold">Topics you come back to</h2>
          <p className="text-[15px] text-ink-muted">Hashtags used on {MIN_POSTS} or more posts, with their typical engagement.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {topics.slice(0, 12).map((t) => (
              <li key={t.topic} className="rounded-full bg-surface-2 px-3 py-1.5 text-[15px]">
                <span className="font-semibold">{t.topic}</span> <span className="text-ink-muted">· {formatPercent(t.medianEngagementRate)} · {t.count} posts</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
