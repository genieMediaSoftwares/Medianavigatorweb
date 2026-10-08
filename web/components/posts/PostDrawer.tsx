'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, FileText, GitCompare, Sparkles, Video } from 'lucide-react';
import { intelligenceApi, mediaApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { CLASSIFICATION, METRIC_LABEL, PLATFORM_LABEL, formatLabel } from '@/lib/copy';
import { formatChange, formatCompact, formatDate, formatDuration, formatNumber, formatPercent, pctChange } from '@/lib/format';
import { classify, MIN_HISTORY } from '@/lib/performance';
import { useMe, useSummary } from '@/lib/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Dialog';
import { SelectField } from '@/components/ui/Field';
import { HelpPopover } from '@/components/ui/Help';
import { AiStatusNote, Layer, aiRan } from '@/components/ui/Layers';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { ErrorState, FormError, ListSkeleton, Skeleton } from '@/components/ui/States';
import type { Baseline, Media } from '@/types/api';

const VIDEO_TYPES = new Set(['reel', 'short', 'video']);

export function PostDrawer({ mediaId, onClose }: { mediaId: string | null; onClose: () => void }) {
  return (
    <Drawer open={mediaId !== null} onOpenChange={(o) => !o && onClose()} title="Post details">
      {mediaId ? <PostDetail key={mediaId} id={mediaId} /> : null}
    </Drawer>
  );
}

function PostDetail({ id }: { id: string }) {
  const tz = useMe().data?.profile?.timezone;
  const item = useQuery({ queryKey: qk.mediaItem(id), queryFn: () => mediaApi.get(id) });
  const summary = useSummary('all', 30);

  if (item.isPending) return <ListSkeleton rows={3} />;
  if (item.isError) return <ErrorState error={item.error} onRetry={() => item.refetch()} />;
  const m = item.data;
  const baseline = summary.data?.baselines[m.platform];

  return (
    <div className="space-y-5">
      <header className="flex gap-4">
        <Thumb media={m} className="size-24" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-muted">
            <PlatformIcon platform={m.platform} className="size-5" />
            {PLATFORM_LABEL[m.platform]} · {formatLabel(m.contentType, m.contentTypeBasis)} · {formatDate(m.publishedAt, tz)}
          </p>
          <h2 className="mt-1 line-clamp-3 text-lg font-semibold">{m.title || 'Untitled post'}</h2>
          {m.mediaUrl ? (
            <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-action hover:underline">
              Open on {PLATFORM_LABEL[m.platform]} <ExternalLink className="size-4" aria-hidden />
            </a>
          ) : null}
        </div>
      </header>

      <Measured media={m} />
      {summary.isPending ? <Skeleton className="h-40" /> : summary.isError ? <ErrorState error={summary.error} onRetry={() => summary.refetch()} /> : <Calculated media={m} baseline={baseline} />}
      <Meaning media={m} />
    </div>
  );
}

export function Thumb({ media, className }: { media: Pick<Media, 'thumbnailUrl' | 'contentType' | 'title'>; className?: string }) {
  const Icon = VIDEO_TYPES.has(media.contentType) ? Video : FileText;
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl bg-surface-2 ${className ?? ''}`}>
      {media.thumbnailUrl ? (
        // Thumbnails come from each platform's own CDN (signed, short-lived URLs), so they are shown as-is rather than
        // proxied through the image optimizer, and no host list has to be hardcoded.
        <Image src={media.thumbnailUrl} alt="" fill sizes="96px" unoptimized className="object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-ink-subtle" aria-hidden>
          <Icon className="size-6" />
        </div>
      )}
    </div>
  );
}

function Measured({ media: m }: { media: Media }) {
  const unavailable = new Set(m.unavailableMetrics);
  const rows: Array<{ key: string; value: string | null }> = [
    { key: 'views', value: formatNumber(m.views) },
    { key: 'reach', value: formatNumber(m.reach) },
    { key: 'likes', value: formatNumber(m.likes) },
    { key: 'comments', value: formatNumber(m.comments) },
    { key: 'shares', value: formatNumber(m.shares) },
  ];
  if (m.watchTimeMinutes !== null && m.watchTimeMinutes !== undefined) rows.push({ key: 'watchTimeMinutes', value: `${formatNumber(Math.round(m.watchTimeMinutes))} min` });
  else if (unavailable.has('watchTimeMinutes')) rows.push({ key: 'watchTimeMinutes', value: null });
  if (unavailable.has('saves')) rows.push({ key: 'saves', value: null });

  return (
    <Layer kind="measured">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((r) => {
          const missing = r.value === null || unavailable.has(r.key);
          return (
            <div key={r.key} className="rounded-xl bg-surface-2 p-3">
              <dt className="text-sm font-semibold text-ink-muted">{METRIC_LABEL[r.key] ?? r.key}</dt>
              <dd className={missing ? 'mt-1 text-sm text-ink-subtle' : 'mt-0.5 text-xl font-semibold'}>
                {missing ? `Not available from ${PLATFORM_LABEL[m.platform]}` : r.value}
              </dd>
            </div>
          );
        })}
        <div className="rounded-xl bg-surface-2 p-3">
          <dt className="text-sm font-semibold text-ink-muted">Engagement</dt>
          <dd className="mt-0.5 text-xl font-semibold">{formatPercent(m.engagementRate, 2)}</dd>
        </div>
        {m.durationSeconds ? (
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-sm font-semibold text-ink-muted">Length</dt>
            <dd className="mt-0.5 text-xl font-semibold">{formatDuration(m.durationSeconds)}</dd>
          </div>
        ) : null}
      </dl>
      {m.contentTypeBasis === 'inferred' ? (
        <p className="mt-3 text-sm text-ink-subtle">The format is estimated: {PLATFORM_LABEL[m.platform]} doesn&apos;t say directly whether this is a Short.</p>
      ) : null}
    </Layer>
  );
}

function CompareBar({ label, value, typical, format }: { label: string; value: number; typical: number; format: (n: number) => string }) {
  const max = Math.max(value, typical, 0.0001);
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm text-ink-muted">This post</span>
          <div className="h-3 flex-1 rounded-full bg-surface-2"><div className="h-3 rounded-full bg-action" style={{ width: `${(value / max) * 100}%` }} /></div>
          <span className="w-16 shrink-0 text-right text-sm font-semibold">{format(value)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm text-ink-muted">Your typical</span>
          <div className="h-3 flex-1 rounded-full bg-surface-2"><div className="h-3 rounded-full bg-line-strong" style={{ width: `${(typical / max) * 100}%` }} /></div>
          <span className="w-16 shrink-0 text-right text-sm font-semibold">{format(typical)}</span>
        </div>
      </div>
    </div>
  );
}

function Calculated({ media: m, baseline }: { media: Media; baseline?: Baseline }) {
  const cls = classify(m.engagementRate, baseline);
  const tag = CLASSIFICATION[cls];
  const help = (
    <HelpPopover>
      <p>We compare this post with your other {PLATFORM_LABEL[m.platform]} posts only.</p>
      <p>&ldquo;Typical&rdquo; is your median. &ldquo;Doing well&rdquo; means at or above your top quarter and at least 1.25× typical engagement; &ldquo;Could be better&rdquo; means in your bottom quarter and at most 0.75× typical.</p>
      <p>We need at least {MIN_HISTORY} posts on a channel before labelling anything.</p>
    </HelpPopover>
  );
  if (!baseline || cls === 'INSUFFICIENT_DATA') {
    return (
      <Layer kind="calculated" aside={<Badge tone={tag.tone}>{tag.label}</Badge>}>
        <p className="text-ink-muted">
          We need at least {MIN_HISTORY} {PLATFORM_LABEL[m.platform]} posts to compare against{baseline ? ` (we have ${baseline.sampleSize})` : ''}. Keep posting and syncing.
        </p>
        {help}
      </Layer>
    );
  }
  const engVs = pctChange(m.engagementRate, baseline.medianEngagementRate);
  const viewsVs = m.unavailableMetrics.includes('views') ? null : pctChange(m.views, baseline.medianViews);
  return (
    <Layer kind="calculated" aside={<Badge tone={tag.tone}>{tag.label}</Badge>}>
      <p className="mb-4 text-[15px] text-ink-muted">
        {engVs !== null ? `Engagement is ${formatChange(engVs)} compared with your typical ${PLATFORM_LABEL[m.platform]} post` : 'There is no typical engagement to compare with yet'}
        {viewsVs !== null ? `, and views are ${formatChange(viewsVs)}.` : '.'} Based on {baseline.sampleSize} posts.
      </p>
      <div className="space-y-4">
        <CompareBar label="Engagement" value={m.engagementRate} typical={baseline.medianEngagementRate} format={(n) => formatPercent(n)} />
        {viewsVs !== null ? <CompareBar label="Views" value={m.views} typical={baseline.medianViews} format={formatCompact} /> : null}
      </div>
      {help}
    </Layer>
  );
}

function Meaning({ media: m }: { media: Media }) {
  const diagnose = useMutation({ mutationFn: () => intelligenceApi.diagnose(m.id) });
  const video = useMutation({ mutationFn: () => intelligenceApi.analyzeVideo(m.id) });
  const [comparing, setComparing] = useState(false);
  const isVideo = VIDEO_TYPES.has(m.contentType);

  return (
    <Layer kind="meaning">
      <div className="flex flex-wrap gap-2">
        <Button icon={<Sparkles className="size-4" aria-hidden />} loading={diagnose.isPending} onClick={() => diagnose.mutate()}>Explain this post</Button>
        <Button variant="secondary" icon={<GitCompare className="size-4" aria-hidden />} onClick={() => setComparing((v) => !v)} aria-expanded={comparing}>
          Compare with another post
        </Button>
        {isVideo ? (
          <Button variant="secondary" icon={<Video className="size-4" aria-hidden />} loading={video.isPending} onClick={() => video.mutate()}>Deep look</Button>
        ) : null}
      </div>

      {diagnose.isError ? <div className="mt-4"><FormError error={diagnose.error} /></div> : null}
      {diagnose.data ? (
        <div className="mt-5 space-y-3">
          <AiStatusNote ai={diagnose.data.ai} />
          {aiRan(diagnose.data.ai) ? (
            <>
              <p className="font-semibold">{diagnose.data.headline}</p>
              <p className="text-ink-muted">{diagnose.data.executiveSummary}</p>
              {diagnose.data.actionableChecklist.length ? (
                <div>
                  <p className="font-semibold">Things to try</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-muted">{diagnose.data.actionableChecklist.slice(0, 3).map((a) => <li key={a}>{a}</li>)}</ul>
                </div>
              ) : null}
              {diagnose.data.suggestedHookAlternative ? <p className="text-ink-muted"><span className="font-semibold text-ink">Another way to open: </span>{diagnose.data.suggestedHookAlternative}</p> : null}
            </>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-ink-muted">
              <li>{diagnose.data.baselineComparison}</li>
              <li>{diagnose.data.metricBreakdown.viewsAnalysis}</li>
              <li>{diagnose.data.metricBreakdown.engagementHealth}</li>
              <li>{diagnose.data.recommendedFormatAndTiming}</li>
              {diagnose.data.actionableChecklist.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
          {diagnose.data.limitations.length ? (
            <p className="text-sm text-ink-subtle">{diagnose.data.limitations.join(' ')}</p>
          ) : null}
        </div>
      ) : null}

      {video.isError ? <div className="mt-4"><FormError error={video.error} /></div> : null}
      {video.data ? (
        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <p className="font-semibold">Deep look</p>
          <AiStatusNote ai={video.data.ai} />
          {video.data.hookAssessment ? <p className="text-ink-muted"><span className="font-semibold text-ink">Opening: </span>{video.data.hookAssessment}</p> : null}
          {video.data.captionAssessment ? <p className="text-ink-muted"><span className="font-semibold text-ink">Caption: </span>{video.data.captionAssessment}</p> : null}
          {video.data.recommendations.length ? <ul className="list-disc space-y-1 pl-5 text-ink-muted">{video.data.recommendations.map((r) => <li key={r}>{r}</li>)}</ul> : null}
          {video.data.testedAlternativeHook ? <p className="text-ink-muted"><span className="font-semibold text-ink">Another way to open: </span>{video.data.testedAlternativeHook}</p> : null}
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-sm font-semibold">What we can&apos;t see</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-ink-muted">{video.data.unavailable.map((u) => <li key={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</li>)}</ul>
            <p className="mt-2 text-sm text-ink-subtle">{video.data.limitations.join(' ')} We never estimate scores we can&apos;t measure.</p>
          </div>
        </div>
      ) : null}

      {comparing ? <ComparePanel media={m} /> : null}
    </Layer>
  );
}

function ComparePanel({ media: m }: { media: Media }) {
  const others = useQuery({ queryKey: [...qk.media(m.platform), 'compare'], queryFn: () => mediaApi.page({ platform: m.platform, limit: 50 }) });
  const [other, setOther] = useState('');
  const compare = useMutation({ mutationFn: (b: string) => intelligenceApi.compare(m.id, b) });
  const options = (others.data?.items ?? []).filter((o) => o.id !== m.id);

  return (
    <div className="mt-5 space-y-3 border-t border-line pt-4">
      {others.isPending ? <Skeleton className="h-11" /> : others.isError ? <ErrorState error={others.error} onRetry={() => others.refetch()} /> : options.length === 0 ? (
        <p className="text-ink-muted">There&apos;s no other {PLATFORM_LABEL[m.platform]} post to compare with yet.</p>
      ) : (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (other) compare.mutate(other); }}>
          <div className="min-w-0 flex-1">
            <SelectField label={`Compare with another ${PLATFORM_LABEL[m.platform]} post`} value={other} onChange={(e) => setOther(e.target.value)}>
              <option value="">Choose a post</option>
              {options.map((o) => <option key={o.id} value={o.id}>{(o.title || 'Untitled').slice(0, 70)}</option>)}
            </SelectField>
          </div>
          <Button type="submit" variant="secondary" disabled={!other} loading={compare.isPending}>Compare</Button>
        </form>
      )}
      {compare.isError ? <FormError error={compare.error} /> : null}
      {compare.data ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[15px]">
            <caption className="sr-only">This post compared with the chosen post</caption>
            <thead><tr className="text-sm text-ink-muted"><th className="py-2 font-semibold">&nbsp;</th><th className="py-2 font-semibold">This post</th><th className="py-2 font-semibold">Other post</th><th className="py-2 font-semibold">Difference</th></tr></thead>
            <tbody>
              {([['Views', 'views', formatNumber], ['Likes', 'likes', formatNumber], ['Comments', 'comments', formatNumber], ['Engagement', 'engagementRatePct', (n: number) => formatPercent(n, 2)]] as const).map(([label, key, fmt]) => {
                const d = compare.data.comparison[key];
                return (
                  <tr key={key} className="border-t border-line">
                    <th scope="row" className="py-2 font-semibold">{label}</th>
                    <td className="py-2">{fmt(d.a)}</td>
                    <td className="py-2">{fmt(d.b)}</td>
                    <td className="py-2">{d.differencePct === null ? 'Not comparable' : formatChange(d.differencePct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {compare.data.note ? <p className="mt-2 text-sm text-ink-subtle">{compare.data.note}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
