'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Badge, type Tone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { LinkButton } from '@/components/ui/button';
import { api } from '@/lib/api/endpoints';
import { platformName } from '@/lib/platforms';
import { qk } from '@/lib/queryKeys';
import type { TrendItem } from '@/types/api';

const STATUS: Record<string, { tone: Tone; label: string }> = {
  Rising: { tone: 'good', label: 'Rising' },
  Stable: { tone: 'neutral', label: 'Stable' },
  'Losing momentum': { tone: 'warn', label: 'Losing momentum' },
};

function TrendCard({ t }: { t: TrendItem }) {
  const [open, setOpen] = useState(false);
  const s = STATUS[t.status] ?? { tone: 'neutral' as Tone, label: t.status };
  const details: Array<[string, string | undefined]> = [
    ['Why it matters', t.reasonForRelevance],
    ['Where to try it', t.recommendedPlatform ? platformName(t.recommendedPlatform) : undefined],
    ['Format', t.suggestedFormat],
    ['Idea', t.contentConcept],
    ['A way to open', t.suggestedHook],
    ['Caption direction', t.captionDirection],
    ['Who it is for', t.targetAudienceRelevance],
    ['Next step', t.recommendedNextAction],
  ];
  const rows = details.filter((d): d is [string, string] => Boolean(d[1]));
  return (
    <Card className="flex flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone={s.tone} dot>{s.label}</Badge>
        {t.changeRate && <span className="text-sm font-semibold text-ink tabular">{t.changeRate}</span>}
      </div>
      <h3 className="mt-3 text-lg">{t.name}</h3>
      <p className="mt-1 text-[15px] text-muted">{t.explanation}</p>
      {rows.length > 0 && (
        <div className="mt-4">
          <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex h-10 items-center gap-1 rounded-lg text-sm font-semibold text-brand-600 hover:underline">
            {open ? 'Hide details' : 'Show details'}<ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {open && (
            <dl className="mt-2 space-y-2 rounded-xl bg-brand-50 p-4 text-sm">
              {rows.map(([k, v]) => <div key={k}><dt className="font-semibold text-ink">{k}</dt><dd className="text-muted">{v}</dd></div>)}
            </dl>
          )}
        </div>
      )}
    </Card>
  );
}

export function Trends() {
  const q = useQuery({ queryKey: qk.trends, queryFn: api.trends, staleTime: 60_000 });
  if (q.isPending) return <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}</div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (q.data.trends.length === 0) return <EmptyState icon={<TrendingUp className="h-7 w-7" />} title="Nothing is changing yet" description="We need a few more posts before we can tell what is rising or fading. Sync your channels to bring in your latest posts." action={<LinkButton href="/connections">Go to Connections</LinkButton>} />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">What is going up or down in your own posts. These come from your numbers, not from outside trends.</p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{q.data.trends.map((t) => <TrendCard key={t.id} t={t} />)}</div>
    </div>
  );
}
