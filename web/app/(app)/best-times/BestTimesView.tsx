'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Clock } from 'lucide-react';
import { intelligenceApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { HelpPopover } from '@/components/ui/Help';
import { CardsSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import type { Timing, TimingSlot } from '@/types/api';

const DAYS: Array<{ key: TimingSlot['day']; label: string; full: string }> = [
  { key: 'Mon', label: 'Mon', full: 'Monday' }, { key: 'Tue', label: 'Tue', full: 'Tuesday' }, { key: 'Wed', label: 'Wed', full: 'Wednesday' },
  { key: 'Thu', label: 'Thu', full: 'Thursday' }, { key: 'Fri', label: 'Fri', full: 'Friday' }, { key: 'Sat', label: 'Sat', full: 'Saturday' }, { key: 'Sun', label: 'Sun', full: 'Sunday' },
];
const TIMES: Array<{ key: TimingSlot['timeOfDay']; hours: string; start: string }> = [
  { key: 'Morning', hours: '6am–12pm', start: '09:00' },
  { key: 'Afternoon', hours: '12–5pm', start: '13:00' },
  { key: 'Evening', hours: '5–10pm', start: '18:00' },
  { key: 'Night', hours: '10pm–6am', start: '22:00' },
];
const heat = (score: number, count: number) =>
  count === 0 ? 'bg-heat-0' : score >= 80 ? 'bg-heat-4 text-on-action' : score >= 60 ? 'bg-heat-3' : score >= 40 ? 'bg-heat-2' : 'bg-heat-1';
const heatWord = (score: number) => (score >= 80 ? 'Strongest' : score >= 60 ? 'Strong' : score >= 40 ? 'Fair' : 'Weaker');

export function BestTimesView() {
  const timing = useQuery({ queryKey: qk.timing, queryFn: intelligenceApi.timing });
  return (
    <>
      <PageHeader title="Best times to post" description="Based on when your own posts got the most engagement." />
      {timing.isPending ? (
        <CardsSkeleton count={2} />
      ) : timing.isError ? (
        <ErrorState error={timing.error} onRetry={() => timing.refetch()} />
      ) : !timing.data.hasData ? (
        <EmptyState
          icon={<Clock className="size-6" />}
          title="We need at least 3 posts"
          body="Once we've imported at least 3 of your posts, we'll show which days and times have worked best for you."
          action={<ButtonLink href="/connections">Check your channels</ButtonLink>}
        />
      ) : (
        <Body timing={timing.data} />
      )}
    </>
  );
}

function Body({ timing }: { timing: Timing }) {
  const w = timing.strongestWindow;
  const [dayLabel, timeOfDay] = w ? w.label.split(' — ') : [];
  const slot = TIMES.find((t) => t.key === timeOfDay);
  const day = DAYS.find((d) => d.key === dayLabel || d.full === dayLabel);
  const planHref = day && slot ? `/plan/planner?day=${day.full}&time=${slot.start}` : '/plan/planner';
  const cell = (d: TimingSlot['day'], t: TimingSlot['timeOfDay']) => timing.matrix.find((m) => m.day === d && m.timeOfDay === t);

  return (
    <div className="space-y-6">
      {w ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 bg-tint">
          <div>
            <p className="text-sm font-semibold text-action">Your best time to post</p>
            <p className="mt-1 font-display text-3xl font-semibold">{day?.full ?? dayLabel} {timeOfDay?.toLowerCase()}</p>
            <p className="text-ink-muted">{w.timeSlot} · times are in {timing.timezone}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={w.confidence === 'High' ? 'good' : 'neutral'}>{w.confidence === 'High' ? 'Solid evidence' : 'Early signal'}</Badge>
              <span className="text-sm text-ink-muted">{w.supportingText}</span>
            </div>
          </div>
          <ButtonLink href={planHref} icon={<CalendarPlus className="size-4" aria-hidden />}>Plan a post</ButtonLink>
        </Card>
      ) : null}

      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Week at a glance</h2>
            <p className="text-[15px] text-ink-muted">Darker means your posts at that time did better. Times are in {timing.timezone}.</p>
          </div>
          <HelpPopover>
            <p>We group your posts by the day and part of the day they were published (in your time zone) and compare their average engagement. The best slot is 100; others are shown relative to it.</p>
            <p>&ldquo;Solid evidence&rdquo; means the best slot has 5 or more posts. &ldquo;Early signal&rdquo; means fewer, so treat it as a hint.</p>
            <p>We can&apos;t see when your audience is online, only how your own posts did.</p>
          </HelpPopover>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-1.5 text-center">
            <caption className="sr-only">How your posts did by day and time of day</caption>
            <thead>
              <tr>
                <th scope="col" className="w-28" />
                {DAYS.map((d) => <th key={d.key} scope="col" className="text-sm font-semibold text-ink-muted"><abbr title={d.full} className="no-underline">{d.label}</abbr></th>)}
              </tr>
            </thead>
            <tbody>
              {TIMES.map((t) => (
                <tr key={t.key}>
                  <th scope="row" className="text-left text-sm font-semibold">
                    {t.key}
                    <span className="block text-xs font-normal text-ink-subtle">{t.hours}</span>
                  </th>
                  {DAYS.map((d) => {
                    const c = cell(d.key, t.key);
                    const count = c?.sampleCount ?? 0;
                    const score = c?.score ?? 0;
                    const desc = count === 0 ? 'No posts yet' : `${heatWord(score)} · ${count} post${count === 1 ? '' : 's'}`;
                    return (
                      <td key={d.key} className="p-0">
                        <div
                          tabIndex={0}
                          title={`${d.full} ${t.key.toLowerCase()}: ${desc}`}
                          aria-label={`${d.full} ${t.key.toLowerCase()}: ${desc}`}
                          className={cn('grid h-14 place-items-center rounded-lg px-1 text-xs font-semibold', heat(score, count), count === 0 && 'text-ink-subtle')}
                        >
                          {count === 0 ? 'No posts yet' : count}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-muted" aria-hidden>
          <span>Weaker</span>
          {['bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'].map((c) => <span key={c} className={cn('h-3 w-8 rounded', c)} />)}
          <span>Stronger</span>
          <span className="ml-2">Numbers show how many posts each square is based on.</span>
        </div>
      </Card>
    </div>
  );
}
