'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { ConfirmDialog, Modal } from '@/components/ui/dialog';
import { PlatformTile } from '@/components/ui/platform-logo';
import { EmptyState, ErrorState, Notice } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api/endpoints';
import { useConnections } from '@/lib/hooks/useQueries';
import { platformName, typeLabel } from '@/lib/platforms';
import { qk } from '@/lib/queryKeys';
import { WEEKDAYS, type PlannedItem, type Platform, type Weekday } from '@/types/api';
import { minutesOf, normaliseTime } from './time';

const FORMATS = ['reel', 'short', 'video', 'post', 'carousel', 'article'] as const;
const PLATFORM_VALUES = ['instagram', 'youtube', 'facebook', 'linkedin'] as const;

const schema = z.object({
  day: z.enum(WEEKDAYS as unknown as [Weekday, ...Weekday[]]),
  time: z.string().refine((v) => normaliseTime(v) !== null, 'Enter a time like 6:00 PM'),
  platform: z.enum(PLATFORM_VALUES, { message: 'Choose a channel' }),
  contentType: z.enum(FORMATS),
  title: z.string().trim().min(1, 'Give your idea a short title').max(300, 'Please keep the title under 300 characters'),
});
type FormValues = z.infer<typeof schema>;

const asWeekday = (v: string | null): Weekday => (WEEKDAYS.find((d) => d.toLowerCase() === (v ?? '').toLowerCase()) ?? 'Monday');

export function Planner() {
  const qc = useQueryClient();
  const toast = useToast();
  const params = useSearchParams();
  const items = useQuery({ queryKey: qk.planner, queryFn: api.planner, staleTime: 30_000 });
  const insights = useQuery({ queryKey: qk.plannerInsights, queryFn: api.plannerInsights, staleTime: 60_000 });
  const connections = useConnections();
  const channels = useMemo(() => (connections.data ?? []).filter((c) => c.connected), [connections.data]);

  const prefillDay = params.get('day');
  const prefillTime = params.get('time');
  const [adding, setAdding] = useState(Boolean(prefillDay || prefillTime));
  const [removing, setRemoving] = useState<PlannedItem | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api.removePlanned(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: qk.planner }); void qc.invalidateQueries({ queryKey: qk.recommendations }); toast.success('Removed from your planner'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const header = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-2xl text-[15px] text-muted">Media Navigator doesn’t publish for you. This planner is for your own scheduling.</p>
      <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden="true" />Add to planner</Button>
    </div>
  );

  let body;
  if (items.isPending) body = <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-24" /></div>;
  else if (items.isError) body = <ErrorState error={items.error} onRetry={() => items.refetch()} />;
  else if (items.data.length === 0) body = <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="Your planner is empty" description="Add an idea for a day and time, or pick one from the Ideas tab. It stays here as your own reminder." action={<Button onClick={() => setAdding(true)}>Add your first idea</Button>} />;
  else body = <Week items={items.data} onRemove={setRemoving} />;

  const hints = insights.data?.hasEnoughData ? insights.data.bestWindows.slice(0, 3) : [];

  return (
    <div className="space-y-6">
      {header}
      {hints.length > 0 && (
        <div>
          <h2 className="mb-2 text-base">Good times to post</h2>
          <ul className="flex flex-wrap gap-2" role="list">
            {hints.map((w) => <li key={`${w.day}-${w.timeOfDay}`}><Badge tone="brand">{w.day} {w.timeOfDay.toLowerCase()} · {w.timeSlot}</Badge></li>)}
          </ul>
          {insights.data && <p className="mt-2 text-sm text-muted">Based on your past posts, in {insights.data.timezone}.</p>}
        </div>
      )}
      {body}

      <AddModal open={adding} onOpenChange={setAdding} channels={channels.map((c) => c.platform)} channelsLoading={connections.isPending}
        defaults={{ day: asWeekday(prefillDay), time: prefillTime ?? '' }} />

      <ConfirmDialog open={removing !== null} onOpenChange={(o) => { if (!o) setRemoving(null); }} title="Remove this idea?" message="Remove this idea from your planner?" confirmLabel="Remove"
        onConfirm={async () => { if (removing) await remove.mutateAsync(removing.id).catch(() => undefined); }} />
    </div>
  );
}

function byTime(a: PlannedItem, b: PlannedItem) { return minutesOf(a.time) - minutesOf(b.time); }

function Week({ items, onRemove }: { items: PlannedItem[]; onRemove: (i: PlannedItem) => void }) {
  const sorted = [...items].sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || byTime(a, b));
  return (
    <>
      <div className="hidden gap-3 md:grid md:grid-cols-7" aria-label="Week view">
        {WEEKDAYS.map((d) => {
          const day = items.filter((i) => i.day === d).sort(byTime);
          return (
            <div key={d} className="min-w-0 rounded-2xl border border-line bg-surface p-3">
              <h3 className="mb-2 text-sm">{d.slice(0, 3)}</h3>
              {day.length === 0 ? <p className="text-xs text-subtle">Nothing planned</p> : (
                <ul className="space-y-2" role="list">
                  {day.map((i) => (
                    <li key={i.id} className="rounded-lg bg-brand-50 p-2">
                      <p className="text-xs font-bold text-brand-700 tabular">{i.time}</p>
                      <p className="line-clamp-3 text-[13px] font-medium text-ink">{i.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{platformName(i.platform)} · {typeLabel(i.contentType)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <section aria-labelledby="plan-list-h">
        <h2 id="plan-list-h" className="mb-3 text-xl">All planned ideas</h2>
        <ul className="space-y-3" role="list">
          {sorted.map((i) => (
            <li key={i.id}>
              <Card className="flex items-center gap-4 p-4">
                <PlatformTile platform={i.platform} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{i.title}</p>
                  <p className="text-sm text-muted">{i.day} at {i.time} · {platformName(i.platform)} · {typeLabel(i.contentType)}</p>
                </div>
                <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${i.title}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-bad-bg hover:text-bad"><Trash2 className="h-5 w-5" /></button>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function AddModal({ open, onOpenChange, channels, channelsLoading, defaults }: { open: boolean; onOpenChange: (o: boolean) => void; channels: Platform[]; channelsLoading: boolean; defaults: { day: Weekday; time: string } }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema), mode: 'onTouched',
    defaultValues: { day: defaults.day, time: defaults.time, platform: undefined, contentType: 'post', title: '' },
  });
  useEffect(() => { if (open) reset({ day: defaults.day, time: defaults.time, platform: channels[0], contentType: 'post', title: '' }); }, [open, defaults.day, defaults.time, channels, reset]);

  const add = useMutation({
    mutationFn: (v: FormValues) => api.addPlanned({ day: v.day, time: normaliseTime(v.time) ?? v.time, platform: v.platform, contentType: v.contentType, title: v.title.trim() }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: qk.planner }); void qc.invalidateQueries({ queryKey: qk.recommendations }); toast.success('Added to your planner'); onOpenChange(false); },
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add to your planner" description="A reminder for yourself. We don’t post anything for you.">
      {!channelsLoading && channels.length === 0 ? (
        <Notice tone="info">Connect a channel first, then you can plan posts for it.</Notice>
      ) : (
        <form onSubmit={handleSubmit((v) => add.mutate(v))} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Day" error={errors.day?.message}>{(p) => <Select {...p} {...register('day')}>{WEEKDAYS.map((d) => <option key={d}>{d}</option>)}</Select>}</Field>
            <Field label="Time" error={errors.time?.message} hint="For example 6:00 PM">{(p) => <Input {...p} {...register('time')} placeholder="6:00 PM" autoComplete="off" />}</Field>
            <Field label="Channel" error={errors.platform?.message}>{(p) => <Select {...p} {...register('platform')}>{channels.map((c) => <option key={c} value={c}>{platformName(c)}</option>)}</Select>}</Field>
            <Field label="Format" error={errors.contentType?.message}>{(p) => <Select {...p} {...register('contentType')}>{FORMATS.map((f) => <option key={f} value={f}>{typeLabel(f)}</option>)}</Select>}</Field>
          </div>
          <Field label="Title" error={errors.title?.message}>{(p) => <Input {...p} {...register('title')} placeholder="What will you post?" maxLength={300} />}</Field>
          {add.isError && <p role="alert" className="text-sm font-medium text-bad">{add.error.message}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={add.isPending}>Add to planner</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
