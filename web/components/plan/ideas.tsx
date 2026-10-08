'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, FlaskConical, Lightbulb, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { qk } from '@/lib/queryKeys';
import { WEEKDAYS, type Recommendation } from '@/types/api';
import { normaliseTime } from './time';

const TYPES: Record<Recommendation['type'], { label: string; icon: ReactNode }> = {
  CREATE: { label: 'Do more of this', icon: <Plus className="h-4 w-4" aria-hidden="true" /> },
  REPURPOSE: { label: 'Reuse it', icon: <Copy className="h-4 w-4" aria-hidden="true" /> },
  TEST: { label: 'Try an experiment', icon: <FlaskConical className="h-4 w-4" aria-hidden="true" /> },
};

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <div><h4 className="text-sm font-bold text-ink">{title}</h4><div className="mt-0.5 text-[15px] text-muted">{children}</div></div>;
}

function IdeaCard({ rec, n }: { rec: Recommendation; n: number }) {
  const qc = useQueryClient();
  const [added, setAdded] = useState(rec.status === 'planned');
  const [picking, setPicking] = useState(false);
  const [day, setDay] = useState<string>('Monday');
  const [time, setTime] = useState('');
  const [timeErr, setTimeErr] = useState<string | undefined>();
  const t = TYPES[rec.type] ?? TYPES.CREATE;

  const plan = useMutation<unknown, ApiError, { day?: string; time?: string } | undefined>({
    mutationFn: (slot) => api.planRecommendation(rec.id, slot),
    onSuccess: () => { setAdded(true); setPicking(false); void qc.invalidateQueries({ queryKey: qk.planner }); void qc.invalidateQueries({ queryKey: qk.recommendations }); },
  });

  const why = [rec.identifiedProblem ?? rec.reason, rec.supportingPattern ?? rec.supportingSignal].filter(Boolean).join(' ');
  const todo = [rec.recommendedImprovement ?? rec.actionText, rec.suggestedImplementation].filter(Boolean).join(' ');

  const submitPick = () => {
    const norm = normaliseTime(time);
    if (!norm) { setTimeErr('Enter a time like 6:00 PM'); return; }
    setTimeErr(undefined);
    plan.mutate({ day, time: norm });
  };

  return (
    <Card className="flex h-full flex-col p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white tabular" aria-hidden="true">{n}</span>
        <Badge tone="brand">{t.icon}{t.label}</Badge>
      </div>
      <h3 className="mt-4 text-lg"><span className="sr-only">Idea {n}: </span>{rec.title}</h3>
      <div className="mt-4 flex-1 space-y-3">
        <Block title="Why">{why}</Block>
        <Block title="What to do">{todo}</Block>
        {rec.expectedMeasurement && <Block title="How you’ll know">{rec.expectedMeasurement}</Block>}
      </div>
      {rec.suggestedSlot && <p className="mt-4"><Badge>Suggested: {rec.suggestedSlot.day}, {rec.suggestedSlot.time} · {rec.suggestedSlot.format}</Badge></p>}

      <div className="mt-5 border-t border-line pt-4">
        {added ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-good"><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Added to your planner</span><Link href="/plan?tab=planner" className="text-brand-600 hover:underline">See it in the Planner</Link></p>
        ) : picking ? (
          <form onSubmit={(e) => { e.preventDefault(); submitPick(); }} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Day">{(p) => <Select {...p} value={day} onChange={(e) => setDay(e.target.value)}>{WEEKDAYS.map((d) => <option key={d}>{d}</option>)}</Select>}</Field>
              <Field label="Time" error={timeErr}>{(p) => <Input {...p} value={time} onChange={(e) => setTime(e.target.value)} placeholder="6:00 PM" autoComplete="off" />}</Field>
            </div>
            <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" loading={plan.isPending}>Add to planner</Button><Button size="sm" variant="ghost" onClick={() => setPicking(false)}>Cancel</Button></div>
          </form>
        ) : (
          <Button variant="secondary" loading={plan.isPending} onClick={() => (rec.suggestedSlot ? plan.mutate(undefined) : setPicking(true))}>Add to planner</Button>
        )}
        {plan.isError && <p role="alert" className="mt-2 text-sm font-medium text-warn">{plan.error.status === 422 ? 'We need a little more history first. Pick a day and time yourself and we’ll add it.' : plan.error.message}</p>}
      </div>
    </Card>
  );
}

export function Ideas() {
  const q = useQuery({ queryKey: qk.recommendations, queryFn: api.recommendations, staleTime: 60_000 });
  if (q.isPending) return <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}</div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const items = q.data.items.filter((r) => r.status !== 'dismissed');
  if (items.length === 0) return <EmptyState icon={<Lightbulb className="h-7 w-7" />} title="No ideas yet" description="We suggest ideas once we have enough posts to learn from. Sync your channels and check back." action={<LinkButton href="/connections">Go to Connections</LinkButton>} />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Ideas drawn from your own results. Media Navigator only suggests; you decide what to post.</p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{items.map((r, i) => <IdeaCard key={r.id} rec={r} n={i + 1} />)}</div>
    </div>
  );
}
