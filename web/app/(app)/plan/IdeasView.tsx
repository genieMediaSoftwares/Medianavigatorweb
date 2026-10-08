'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Lightbulb, Check } from 'lucide-react';
import { intelligenceApi, plannerApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { qk } from '@/lib/query-keys';
import { WEEKDAYS } from '@/lib/api/schemas';
import { useSummary } from '@/lib/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { SelectField, TextField } from '@/components/ui/Field';
import { CardsSkeleton, EmptyState, ErrorState, FormError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import type { Recommendation, Weekday } from '@/types/api';

const TYPE_LABEL: Record<Recommendation['type'], string> = { CREATE: 'Do more of this', REPURPOSE: 'Reuse it', TEST: 'Try an experiment' };

export function IdeasView() {
  const recs = useQuery({ queryKey: qk.recommendations, queryFn: intelligenceApi.recommendations });
  const summary = useSummary('all', 30);

  return (
    <>
      <PageHeader title="Ideas for your next posts" description="Each idea comes from your own results. Add the ones you like to your planner." />
      {recs.isPending ? (
        <CardsSkeleton count={3} />
      ) : recs.isError ? (
        <ErrorState error={recs.error} onRetry={() => recs.refetch()} />
      ) : recs.data.items.length === 0 ? (
        <EmptyState icon={<Lightbulb className="size-6" />} title="No ideas yet" body="Ideas appear once we've imported some of your posts." action={<ButtonLink href="/connections">Check your channels</ButtonLink>} />
      ) : (
        <ol className="space-y-4">
          {recs.data.items.map((r, i) => <IdeaCard key={r.id} rec={r} n={i + 1} />)}
        </ol>
      )}

      {summary.data && summary.data.contentIdeas.items.length ? (
        <section className="mt-8" aria-labelledby="more-ideas">
          <h2 id="more-ideas" className="text-lg font-semibold">More ideas from your numbers</h2>
          <p className="text-[15px] text-ink-muted">Simple rules applied to your results, not AI.</p>
          <ul className="mt-3 space-y-2">
            {summary.data.contentIdeas.items.map((idea) => (
              <li key={idea.idea} className="rounded-xl border border-line bg-surface p-4">
                <p className="font-semibold">{idea.idea}</p>
                <p className="mt-1 text-sm text-ink-muted">Why: {idea.basedOn}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function IdeaCard({ rec, n }: { rec: Recommendation; n: number }) {
  const client = useQueryClient();
  const toast = useToast();
  const [picking, setPicking] = useState(!rec.suggestedSlot);
  const [day, setDay] = useState<Weekday | ''>('');
  const [time, setTime] = useState('');
  const [added, setAdded] = useState(false);
  const plan = useMutation({
    mutationFn: (body: { day?: Weekday; time?: string }) => plannerApi.planRecommendation(rec.id, body),
    onSuccess: () => {
      setAdded(true);
      void client.invalidateQueries({ queryKey: qk.planner });
      toast('Added to your planner.');
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 422) setPicking(true);
    },
  });
  const needsMoreHistory = plan.error instanceof ApiError && plan.error.status === 422;

  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-action text-sm font-bold text-on-action" aria-hidden>{n}</span>
          <Badge tone="info">{TYPE_LABEL[rec.type]}</Badge>
        </div>
        <h2 className="mt-3 text-lg font-semibold">{rec.title}</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div><dt className="text-sm font-semibold text-ink-muted">Why</dt><dd className="text-[15px]">{rec.reason} {rec.supportingSignal}</dd></div>
          <div><dt className="text-sm font-semibold text-ink-muted">What to do</dt><dd className="text-[15px]">{rec.recommendedImprovement ?? rec.suggestedImplementation ?? '—'}</dd></div>
          <div><dt className="text-sm font-semibold text-ink-muted">How you&apos;ll know</dt><dd className="text-[15px]">{rec.expectedMeasurement ?? 'Compare its engagement with this post.'}</dd></div>
        </dl>
        {rec.suggestedSlot ? <p className="mt-3 text-sm text-ink-muted">Suggested time: {rec.suggestedSlot.day}, {rec.suggestedSlot.time}</p> : null}

        <div className="mt-4">
          {added ? (
            <p className="inline-flex items-center gap-2 font-semibold text-good-fg"><Check className="size-4" aria-hidden /> In your planner</p>
          ) : picking ? (
            <form
              className="space-y-3"
              onSubmit={(e) => { e.preventDefault(); if (day && time) plan.mutate({ day, time }); }}
            >
              {needsMoreHistory ? <FormError error="We need a little more history first to suggest a time. Pick a day and time yourself." /> : !rec.suggestedSlot ? <p className="text-sm text-ink-muted">Pick a day and time for this idea.</p> : null}
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <SelectField label="Day" value={day} onChange={(e) => setDay(e.target.value as Weekday)} required>
                  <option value="">Choose a day</option>
                  {WEEKDAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </SelectField>
                <TextField label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                <Button type="submit" disabled={!day || !time} loading={plan.isPending} icon={<CalendarPlus className="size-4" aria-hidden />}>Add to planner</Button>
              </div>
            </form>
          ) : (
            <>
              {plan.isError && !needsMoreHistory ? <div className="mb-3"><FormError error={plan.error} /></div> : null}
              <Button loading={plan.isPending} onClick={() => plan.mutate({})} icon={<CalendarPlus className="size-4" aria-hidden />}>Add to planner</Button>
            </>
          )}
        </div>
      </Card>
    </li>
  );
}
