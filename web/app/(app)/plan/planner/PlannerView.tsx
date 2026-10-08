'use client';

import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { CalendarDays, Info, Trash2 } from 'lucide-react';
import { plannerApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { PLATFORMS, WEEKDAYS } from '@/lib/api/schemas';
import { PLATFORM_LABEL, formatLabel } from '@/lib/copy';
import { formatPercent } from '@/lib/format';
import { connectedOnly, useConnections } from '@/lib/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { ConfirmDialog, useConfirm } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/Field';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { EmptyState, ErrorState, FormError, ListSkeleton, Skeleton, errorMessage } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import type { PlannedItem } from '@/types/api';

const FORMATS = ['post', 'reel', 'carousel', 'short', 'video', 'article'] as const;

const schema = z.object({
  title: z.string().trim().min(1, 'Give it a short title').max(300, 'Use 300 characters or fewer'),
  day: z.enum(WEEKDAYS, { error: 'Choose a day' }),
  time: z.string().min(1, 'Choose a time').max(20),
  platform: z.enum(PLATFORMS, { error: 'Choose a channel' }),
  contentType: z.string().max(30),
});
type Values = z.infer<typeof schema>;

export function PlannerView() {
  const list = useQuery({ queryKey: qk.planner, queryFn: plannerApi.list });
  const insights = useQuery({ queryKey: qk.plannerInsights, queryFn: plannerApi.insights });
  const confirm = useConfirm<PlannedItem>();
  const client = useQueryClient();
  const toast = useToast();
  const remove = useMutation({
    mutationFn: (id: string) => plannerApi.remove(id),
    onMutate: async (id) => {
      // Optimistic: the item disappears at once and comes back if the server refuses.
      await client.cancelQueries({ queryKey: qk.planner });
      const prev = client.getQueryData<PlannedItem[]>(qk.planner);
      client.setQueryData<PlannedItem[]>(qk.planner, (old) => old?.filter((p) => p.id !== id));
      return { prev };
    },
    onError: (e, _id, ctx) => {
      if (ctx?.prev) client.setQueryData(qk.planner, ctx.prev);
      toast(errorMessage(e), 'error');
    },
    onSuccess: () => toast('Removed from your planner.'),
    onSettled: () => {
      confirm.close();
      void client.invalidateQueries({ queryKey: qk.planner });
    },
  });

  return (
    <>
      <PageHeader title="Planner" description="Your own posting plan for the week." />
      <p className="mb-6 flex items-start gap-2 rounded-xl bg-neutral-bg px-4 py-3 text-[15px] text-neutral-fg" role="note">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Media Navigator doesn&apos;t publish for you. This planner is for your own scheduling.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="This week" />
            {list.isPending ? <ListSkeleton rows={3} /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : list.data.length === 0 ? (
              <EmptyState icon={<CalendarDays className="size-6" />} title="Nothing planned yet" body="Add your first post with the form, or pick an idea from the Ideas tab." className="border-0 bg-transparent py-6" />
            ) : (
              <Week items={list.data} onDelete={confirm.ask} />
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <AddForm />
          <Card>
            <CardHeader title="Good times to post" as="h2" />
            {insights.isPending ? <Skeleton className="h-24" /> : insights.isError ? <ErrorState error={insights.error} onRetry={() => insights.refetch()} /> : !insights.data.hasEnoughData || insights.data.bestWindows.length === 0 ? (
              <p className="text-[15px] text-ink-muted">We need at least 5 posts before suggesting times. We have {insights.data.basedOn.posts}.</p>
            ) : (
              <ul className="space-y-2">
                {insights.data.bestWindows.map((w) => (
                  <li key={`${w.day}-${w.timeOfDay}`} className="rounded-xl bg-surface-2 p-3">
                    <p className="font-semibold">{w.day} {w.timeOfDay.toLowerCase()}</p>
                    <p className="text-sm text-ink-muted">{w.timeSlot} · {formatPercent(w.meanEngagementRate)} average engagement · {w.sampleCount} posts · {w.timezone}</p>
                  </li>
                ))}
              </ul>
            )}
            {insights.data?.contentGaps.length ? (
              <div className="mt-4 space-y-1">
                {insights.data.contentGaps.map((g) => (
                  <p key={g.platform} className="text-sm text-warn-fg">
                    {PLATFORM_LABEL[g.platform]}: {g.daysSinceLastPost === null ? 'no posts imported yet.' : `nothing posted in ${g.daysSinceLastPost} days.`}
                  </p>
                ))}
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(o) => !o && confirm.close()}
        title="Remove this from your planner?"
        consequence={`"${confirm.target?.title ?? ''}" will be removed from your plan. Nothing on your social accounts changes.`}
        confirmLabel="Remove"
        onConfirm={() => confirm.target && remove.mutate(confirm.target.id)}
        pending={remove.isPending}
      />
    </>
  );
}

function Week({ items, onDelete }: { items: PlannedItem[]; onDelete: (p: PlannedItem) => void }) {
  return (
    <ol className="space-y-4">
      {WEEKDAYS.map((day) => {
        const today = items.filter((i) => i.day === day).sort((a, b) => a.time.localeCompare(b.time));
        return (
          <li key={day}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">{day}</h3>
            {today.length === 0 ? (
              <p className="mt-1 text-sm text-ink-subtle">Nothing planned</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {today.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                    <PlatformIcon platform={p.platform} className="size-6" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.title}</p>
                      <p className="text-sm text-ink-muted">
                        {p.time} · {formatLabel(p.contentType ?? 'post')}
                        {p.isRecommended ? <Badge tone="info" className="ml-2">From an idea</Badge> : null}
                      </p>
                    </div>
                    <button type="button" onClick={() => onDelete(p)} className="grid size-11 place-items-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-bad-fg" aria-label={`Remove ${p.title}`}>
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function AddForm() {
  const params = useSearchParams();
  const connections = useConnections();
  const channels = connectedOnly(connections.data).map((c) => c.platform);
  const client = useQueryClient();
  const toast = useToast();
  const presetDay = WEEKDAYS.find((d) => d === params.get('day'));
  const presetTime = /^\d{2}:\d{2}$/.test(params.get('time') ?? '') ? params.get('time')! : '';
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    values: { title: '', day: presetDay ?? ('' as Values['day']), time: presetTime, platform: (channels[0] ?? '') as Values['platform'], contentType: 'post' },
    resetOptions: { keepDirtyValues: true },
  });
  const add = useMutation({
    mutationFn: (v: Values) => plannerApi.add({ ...v, contentType: v.contentType || undefined }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.planner });
      reset();
      toast('Added to your planner.');
    },
  });

  return (
    <Card>
      <CardHeader title="Add a post" as="h2" />
      <form className="space-y-3" noValidate onSubmit={handleSubmit((v) => add.mutate(v))}>
        {add.isError ? <FormError error={add.error} /> : null}
        <TextField label="Title" placeholder="What's it about?" error={errors.title?.message} {...register('title')} />
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Day" error={errors.day?.message} {...register('day')}>
            <option value="">Choose</option>
            {WEEKDAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </SelectField>
          <TextField label="Time" type="time" error={errors.time?.message} {...register('time')} />
        </div>
        <SelectField label="Channel" error={errors.platform?.message} hint={channels.length ? undefined : 'Connect a channel to choose it here.'} {...register('platform')}>
          <option value="">Choose</option>
          {(channels.length ? channels : PLATFORMS).map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
        </SelectField>
        <SelectField label="Format" {...register('contentType')}>
          {FORMATS.map((f) => <option key={f} value={f}>{formatLabel(f)}</option>)}
        </SelectField>
        <Button type="submit" className="w-full" loading={add.isPending}>Add to planner</Button>
      </form>
    </Card>
  );
}
