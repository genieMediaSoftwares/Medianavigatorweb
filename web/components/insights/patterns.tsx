'use client';

import { useQuery } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api/endpoints';
import { compact, percent } from '@/lib/format';
import { useChannel } from '@/lib/hooks/useChannel';
import { useSummary } from '@/lib/hooks/useQueries';
import { typeLabel } from '@/lib/platforms';
import { pluralFormat } from './labels';
import { qk } from '@/lib/queryKeys';

const MIN_POSTS = 3;

export function Patterns() {
  const { channel } = useChannel();
  const patterns = useQuery({ queryKey: qk.patterns, queryFn: api.patterns, staleTime: 60_000 });
  const summary = useSummary(channel, 365);

  if (patterns.isPending || summary.isPending) return <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}</div>;
  if (patterns.isError) return <ErrorState error={patterns.error} onRetry={() => patterns.refetch()} />;
  if (summary.isError) return <ErrorState error={summary.error} onRetry={() => summary.refetch()} />;

  const rows = patterns.data;
  // Your usual: the typical engagement of your posts. Fall back to the mean of the formats when we have no figure.
  const baselines = Object.values(summary.data.baselines);
  const usual = baselines.length ? baselines.reduce((s, b) => s + b.medianEngagementRate, 0) / baselines.length : rows.length ? rows.reduce((s, r) => s + r.avgEngagement, 0) / rows.length : 0;
  const strong = rows.filter((r) => r.count >= MIN_POSTS).sort((a, b) => b.avgEngagement - a.avgEngagement);
  const hidden = rows.length - strong.length;

  if (strong.length === 0) return <EmptyState icon={<Layers className="h-7 w-7" />} title="No repeatable patterns yet" description={`We only show a pattern once it is based on at least ${MIN_POSTS} posts. Keep posting and syncing and they will appear here.`} action={<LinkButton href="/connections">Go to Connections</LinkButton>} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Compared with your usual engagement of {percent(usual, 2)} per post.</p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {strong.map((r) => {
          const diff = usual > 0 ? ((r.avgEngagement - usual) / usual) * 100 : 0;
          const better = diff >= 0;
          const rounded = Math.abs(Math.round(diff));
          return (
            <Card key={r.format} className="p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg">{typeLabel(r.format)}</h3>
                <Badge tone={rounded < 3 ? 'neutral' : better ? 'good' : 'warn'}>{rounded < 3 ? 'About your usual' : `${rounded}% ${better ? 'better' : 'lower'}`}</Badge>
              </div>
              <p className="mt-3 text-[15px] text-text">
                {pluralFormat(r.format)} get <strong>{percent(r.avgEngagement, 2)}</strong> engagement{rounded < 3 ? ', about the same as your usual' : `, ${rounded}% ${better ? 'better' : 'worse'} than your usual`}.
              </p>
              <p className="mt-2 text-sm text-muted">Based on {r.count} posts, with about {compact(r.avgViews)} views each.</p>
            </Card>
          );
        })}
      </div>
      {hidden > 0 && <p className="text-sm text-muted">We left out {hidden} {hidden === 1 ? 'format' : 'formats'} with fewer than {MIN_POSTS} posts, because that is too few to call a pattern.</p>}
    </div>
  );
}
