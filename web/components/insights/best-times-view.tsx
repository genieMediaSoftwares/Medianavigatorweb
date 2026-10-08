'use client';

import { CalendarPlus, Clock } from 'lucide-react';
import { HeatGrid } from '@/components/charts';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe, useTiming } from '@/lib/hooks/useQueries';
import type { Timing } from '@/types/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const FULL: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
const PARTS = ['Morning', 'Afternoon', 'Evening', 'Night'];

/** Turn "Wed — Evening" + "5:00 PM – 10:00 PM" into a day and a start time for the planner. */
function planLink(w: NonNullable<Timing['strongestWindow']>): string {
  const day = FULL[w.label.trim().slice(0, 3)];
  const start = w.timeSlot.split(/[–-]/)[0]?.trim();
  const q = new URLSearchParams({ tab: 'planner' });
  if (day) q.set('day', day);
  if (start) q.set('time', start);
  return `/plan?${q.toString()}`;
}

export function BestTimesView() {
  const timing = useTiming();
  const me = useMe();
  const header = <PageHeader title="Best times" subtitle="When your posts tend to get the most reaction." />;

  if (timing.isPending) return <>{header}<div className="space-y-6"><Skeleton className="h-36" /><Skeleton className="h-80" /></div></>;
  if (timing.isError) return <>{header}<ErrorState error={timing.error} onRetry={() => timing.refetch()} /></>;

  const t = timing.data;
  const total = t.matrix.reduce((s, c) => s + c.sampleCount, 0);
  if (t.hasData === false || total < 3) {
    return <>{header}<EmptyState icon={<Clock className="h-7 w-7" />} title="We need a few more posts" description="Once you have at least 3 posts, we can show which days and times work best for you." action={<LinkButton href="/connections">Go to Connections</LinkButton>} /></>;
  }

  const zone = t.timezone ?? me.data?.profile?.timezone ?? null;
  const w = t.strongestWindow;
  const solid = w?.confidence === 'High';
  const best = w ? { col: w.label.trim().slice(0, 3), row: w.label.split(/[—–-]/).pop()?.trim() ?? '' } : null;

  return (
    <>
      {header}
      <div className="space-y-8">
        {w && (
          <Card className="border-brand-200 bg-brand-50 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="eyebrow">Your best time to post</p>
                <h2 className="mt-1 text-2xl">{w.label}</h2>
                <p className="mt-1 text-[15px] font-semibold text-ink">{w.timeSlot}{zone ? ` (${zone})` : ''}</p>
                <p className="mt-2 max-w-xl text-[15px] text-muted">{w.supportingText}</p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <Badge tone={solid ? 'good' : 'warn'} dot>{solid ? 'Solid evidence' : 'Early signal'}</Badge>
                <LinkButton href={planLink(w)}><CalendarPlus className="h-4 w-4" aria-hidden="true" />Plan a post</LinkButton>
              </div>
            </div>
          </Card>
        )}
        <Card>
          <div className="mb-4">
            <h2 className="text-xl">Your week</h2>
            <p className="mt-1 text-sm text-muted">Darker squares are times when your posts did better. The number is how many posts it is based on.{zone ? ` Times are in ${zone}.` : ''}</p>
          </div>
          <HeatGrid cols={[...DAYS]} rows={PARTS} best={best}
            cells={t.matrix.map((c) => ({ col: c.day, row: c.timeOfDay, score: c.score, count: c.sampleCount }))} />
        </Card>
      </div>
    </>
  );
}
