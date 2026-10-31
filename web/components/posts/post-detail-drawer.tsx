'use client';

import { useMutation } from '@tanstack/react-query';
import { ExternalLink, GitCompareArrows, Sparkles, Video } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/dialog';
import { Select } from '@/components/ui/field';
import { HelpPopover } from '@/components/ui/help';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, Notice } from '@/components/ui/states';
import { PlatformIcon } from '@/components/ui/platform-logo';
import { api } from '@/lib/api/endpoints';
import { compact, dateShort, percent, whole } from '@/lib/format';
import { usePostsFeed, useMediaItem } from '@/lib/hooks/usePosts';
import { useSummary } from '@/lib/hooks/useQueries';
import { TAG_LABEL, TAG_TONE, isUnavailable, tagFor } from '@/lib/performance';
import { platformName, typeLabel } from '@/lib/platforms';
import type { AiMeta, CompareResult, DiagnosePostResult, MediaItem, PostClass } from '@/types/api';
import { DeepVideoAnalysisModal } from '@/components/insights/deep-video-analysis-modal';
import { ContentDiagnosis } from './content-diagnosis';
import { PostThumb } from './post-card';
import { metricWords, plainClass, plainComparison, plainDifference } from './plain-language';

function Block({ step, title, hint, children }: { step: string; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5" aria-labelledby={`blk-${step}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-600" aria-hidden="true">{step}</span>
        <h3 id={`blk-${step}`} className="text-base">{title}</h3>
        {hint}
      </div>
      {children}
    </section>
  );
}

function MetricBox({ label, value, platform, na }: { label: string; value: string; platform: string; na?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-brand-50/40 px-3 py-2.5">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-bold text-ink tabular">
        {na ? <span className="text-sm font-semibold text-subtle">Not available from {platform}</span> : value}
      </dd>
    </div>
  );
}

interface Spread { p25: number; median: number; p75: number; sample: number | null }

/** A simple bar: the shaded band is where the middle half of the person's posts land; the line is their typical result. */
function CompareBar({ value, spread }: { value: number; spread: Spread }) {
  const max = Math.max(spread.p75 * 1.3, value * 1.15, spread.median * 1.6, 0.1);
  const pos = (n: number) => `${Math.min(100, Math.max(0, (n / max) * 100))}%`;
  const bandLeft = (spread.p25 / max) * 100;
  const bandWidth = Math.max(((spread.p75 - spread.p25) / max) * 100, 1.5);
  return (
    <div className="mt-4" role="img" aria-label={`This post: ${percent(value)} engagement. Your typical post: ${percent(spread.median)}. Your middle posts range from ${percent(spread.p25)} to ${percent(spread.p75)}.`}>
      <div className="relative h-9">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-line" />
        <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-brand-200" style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }} />
        <div className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-ink/60" style={{ left: pos(spread.median) }} />
        <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand-600 shadow" style={{ left: pos(value) }} />
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-brand-600" aria-hidden="true" />This post {percent(value)}</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-ink/60" aria-hidden="true" />Your typical post {percent(spread.median)}</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-brand-200" aria-hidden="true" />Middle half of your posts {percent(spread.p25)} to {percent(spread.p75)}</li>
      </ul>
    </div>
  );
}

function AiBanner({ ai }: { ai: AiMeta }) {
  if (ai.status === 'ran' || ai.status === 'cached') {
    return <Notice tone="good">{ai.status === 'cached' ? 'This explanation was written by AI earlier and saved.' : 'This explanation was written by AI from the numbers above.'} It is a suggestion, not a fact.</Notice>;
  }
  return <Notice tone="info">AI explanation isn&apos;t available right now. Here is what we measured and calculated.</Notice>;
}

function DiagnoseView({ d }: { d: DiagnosePostResult }) {
  const isTop = d.status === 'working';
  const bullets = d.sixBulletAnalysis && d.sixBulletAnalysis.length >= 6
    ? d.sixBulletAnalysis.slice(0, 6)
    : [
        ...(d.topSuccessDrivers ?? []),
        ...(d.bottomImprovementPoints ?? []),
        ...(d.actionableChecklist ?? []),
        d.suggestedHookAlternative ? `Opening to try: "${d.suggestedHookAlternative}"` : '',
      ].filter(Boolean).slice(0, 6);

  return (
    <div className="space-y-4">
      <AiBanner ai={d.ai} />
      
      {bullets.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-ink flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-brand-600" />
              What stood out
            </h4>
          </div>
          <div className="space-y-2">
            {bullets.map((b, i) => {
              const colonIndex = b.indexOf(':');
              const hasPrefix = colonIndex > -1 && colonIndex < 35;
              const title = hasPrefix ? b.slice(0, colonIndex).trim() : `Point ${i + 1}`;
              const text = hasPrefix ? b.slice(colonIndex + 1).trim() : b.trim();
              return (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 text-sm shadow-2xs">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold ${
                    isTop ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">{title}</span>
                    <p className="mt-0.5 text-[14px] text-ink">{text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {d.suggestedHookAlternative && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3.5 text-sm dark:bg-brand-950/20 dark:border-brand-900/40">
          <span className="text-xs font-bold text-brand-800 dark:text-brand-300 uppercase tracking-wider block mb-1">
            A different opening to try
          </span>
          <p className="font-semibold text-brand-900 dark:text-brand-200">
            &ldquo;{d.suggestedHookAlternative}&rdquo;
          </p>
        </div>
      )}

      {d.limitations && d.limitations.length > 0 && (
        <div className="pt-2 border-t border-line text-xs text-subtle">
          <p className="font-semibold text-muted mb-1">Good to know</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {d.limitations.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function CompareView({ result, mine }: { result: CompareResult; mine: string }) {
  const [a, b] = result.a.id === mine ? [result.a, result.b] : [result.b, result.a];
  const flip = result.a.id !== mine;
  const rows: Array<{ key: 'views' | 'likes' | 'comments' | 'engagementRatePct'; label: string; fmt: (n: number) => string }> = [
    { key: 'views', label: 'Views', fmt: whole },
    { key: 'likes', label: 'Likes', fmt: whole },
    { key: 'comments', label: 'Comments', fmt: whole },
    { key: 'engagementRatePct', label: 'Engagement', fmt: (n) => percent(n) },
  ];
  const diff = (key: (typeof rows)[number]['key']): number => {
    const c = result.comparison[key];
    // differencePct describes A relative to B. Flip it when "this post" is B.
    return flip ? (c.a === 0 ? 0 : ((c.b - c.a) / c.a) * 100) : c.differencePct;
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr] gap-3 text-sm">
        {[a, b].map((p, i) => (
          <div key={p.id} className="rounded-xl border border-line bg-brand-50/40 p-3">
            <p className="text-[13px] font-semibold text-muted">{i === 0 ? 'This post' : 'Other post'}</p>
            <p className="line-clamp-2 font-semibold text-ink">{p.title || 'Untitled post'}</p>
            <p className="text-[13px] text-subtle">{platformName(p.platform)} · {typeLabel(p.contentType)} · {dateShort(p.publishedAt)}</p>
          </div>
        ))}
      </div>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Side-by-side numbers</caption>
        <thead><tr className="text-[13px] text-muted"><th className="py-1.5 font-semibold" scope="col"><span className="sr-only">Measure</span></th><th className="py-1.5 font-semibold" scope="col">This post</th><th className="py-1.5 font-semibold" scope="col">Other post</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const mineV = a[r.key];
            const otherV = b[r.key];
            return (
              <tr key={r.key} className="border-t border-line align-top">
                <th scope="row" className="py-2 pr-2 font-semibold text-ink">{r.label}</th>
                <td className="py-2 tabular text-ink">{r.fmt(mineV)}<span className="block text-[13px] text-muted">{plainDifference(r.label.toLowerCase(), diff(r.key))} than the other</span></td>
                <td className="py-2 tabular text-ink">{r.fmt(otherV)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {result.note && <Notice tone="info">{result.note}</Notice>}
    </div>
  );
}

function ComparePicker({ postId, onPick, busy }: { postId: string; onPick: (id: string) => void; busy: boolean }) {
  const feed = usePostsFeed('all');
  const [chosen, setChosen] = useState('');
  const options = useMemo(() => (feed.data?.pages.flatMap((p) => p.items) ?? []).filter((p) => p.id !== postId), [feed.data, postId]);
  if (feed.isError) return <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />;
  if (feed.isLoading) return <Skeleton className="h-11" />;
  if (options.length === 0) return <p className="text-[15px] text-muted">You need at least one other post to compare with.</p>;
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-ink" htmlFor="cmp-pick">Pick another post</label>
      <Select id="cmp-pick" value={chosen} onChange={(e) => setChosen(e.target.value)}>
        <option value="">Choose a post…</option>
        {options.map((p) => <option key={p.id} value={p.id}>{(p.title || p.caption || 'Untitled post').slice(0, 48)} · {platformName(p.platform)} · {dateShort(p.publishedAt)}</option>)}
      </Select>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" disabled={!chosen} loading={busy} onClick={() => onPick(chosen)}>Compare</Button>
        {feed.hasNextPage && <Button variant="ghost" size="sm" loading={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>Show more posts</Button>}
      </div>
    </div>
  );
}

function PostDetailBody({ item }: { item: MediaItem }) {
  const summary = useSummary(item.platform, 365);
  const [panel, setPanel] = useState<'compare' | null>(null);
  const diagnose = useMutation({ mutationFn: () => api.diagnosePost(item.id) });
  const compare = useMutation({ mutationFn: (other: string) => api.compare(item.id, other) });
  const [videoOpen, setVideoOpen] = useState(false);
  const isVideo = ['reel', 'short', 'video'].includes(item.contentType);
  const name = platformName(item.platform);

  const d = diagnose.data;
  const baseline = summary.data?.baselines[item.platform];
  const spread: Spread | null = d
    ? { p25: d.calculated.accountP25EngagementPct, median: d.calculated.accountMedianEngagementPct, p75: d.calculated.accountP75EngagementPct, sample: null }
    : baseline ? { p25: baseline.p25EngagementRate, median: baseline.medianEngagementRate, p75: baseline.p75EngagementRate, sample: baseline.sampleSize } : null;
  const insufficient = summary.data?.insufficientHistory.includes(item.platform) ?? false;
  const classification: PostClass = d ? d.calculated.classification : insufficient ? 'INSUFFICIENT_DATA' : (() => { const t = tagFor(item, summary.data); return t === 'doing-well' ? 'TOP' : t === 'could-be-better' ? 'LOW' : t === 'typical' ? 'TYPICAL' : 'INSUFFICIENT_DATA'; })();
  const tag = tagFor(item, summary.data);
  const unavailableNote = item.unavailableMetrics.filter((m) => !['views', 'reach', 'likes', 'comments', 'shares'].includes(m));

  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <div className="w-28 shrink-0 overflow-hidden rounded-xl border border-line"><PostThumb item={item} /></div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <PlatformIcon platform={item.platform} className="h-5 w-5" /><span className="font-semibold text-ink">{name}</span>
            <span aria-hidden="true">·</span><span>{typeLabel(item.contentType, item.contentTypeBasis)}</span>
          </div>
          <h2 className="mt-1 line-clamp-3 text-lg leading-snug">{item.title || item.caption || 'Untitled post'}</h2>
          <p className="mt-1 text-sm text-subtle">Posted {dateShort(item.publishedAt)}</p>
          {item.mediaUrl && <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">Open on {name}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a>}
        </div>
      </div>
      {item.caption && item.caption !== item.title && <p className="line-clamp-4 text-[15px] text-muted">{item.caption}</p>}

      <Block step="1" title="What we measured">
        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <MetricBox label="Views" value={compact(item.views)} platform={name} na={isUnavailable(item, 'views')} />
          <MetricBox label="Reach" value={compact(item.reach)} platform={name} na={isUnavailable(item, 'reach')} />
          <MetricBox label="Likes" value={compact(item.likes)} platform={name} na={isUnavailable(item, 'likes')} />
          <MetricBox label="Comments" value={compact(item.comments)} platform={name} na={isUnavailable(item, 'comments')} />
          <MetricBox label="Shares" value={compact(item.shares)} platform={name} na={isUnavailable(item, 'shares')} />
          <MetricBox label="Engagement" value={percent(item.engagementRate)} platform={name} />
        </dl>
        {unavailableNote.length > 0 && <p className="mt-3 text-sm text-muted">{name} doesn&apos;t share {unavailableNote.map(metricWords).join(', ')} for this post, so we leave {unavailableNote.length > 1 ? 'them' : 'it'} out instead of guessing.</p>}
      </Block>

      <Block step="2" title="What we calculated" hint={
        <HelpPopover>
          <p>We compare this post&apos;s engagement with your typical result on {name} (the middle value of your posts there). The shaded band is where the middle half of your posts land.</p>
        </HelpPopover>
      }>
        {summary.isLoading && <Skeleton className="h-24" />}
        {summary.isError && <Notice tone="warn">We couldn&apos;t load your usual results, so we can&apos;t compare this post yet.</Notice>}
        {!summary.isLoading && !summary.isError && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TAG_TONE[tag]}>{TAG_LABEL[tag]}</Badge>
              <p className="text-[15px] text-muted">{plainClass(classification)}</p>
            </div>
            {spread && !insufficient
              ? <CompareBar value={d ? d.measured.engagementRatePct : item.engagementRate} spread={spread} />
              : <p className="mt-3 text-[15px] text-muted">We need a few more posts on {name} before we can say how this one compares.</p>}
            {d && <p className="mt-3 text-[15px] text-muted">{plainComparison(d.baselineComparison)}.{d.calculated.comparedAgainst ? ` Compared with ${d.calculated.comparedAgainst}.` : ''}</p>}
            {!d && spread?.sample && !insufficient && <p className="mt-3 text-sm text-subtle">Based on {spread.sample} of your {name} posts.</p>}
          </>
        )}
      </Block>

      <Block step="3" title="Performance diagnosis" hint={
        <HelpPopover>
          <p>This compares the post with your own results on {name}, then explains it in the way that matches: what worked if it performed well, or what to change if it did not. Nothing is changed on {name}.</p>
        </HelpPopover>
      }>
        <ContentDiagnosis mediaId={item.id} thumbnailUrl={item.thumbnailUrl} title={item.title || item.caption} platform={item.platform} contentType={item.contentType} />
        {!d && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-[15px] text-muted">Press the button for a shorter explanation of these numbers alone, without reviewing the content itself.</p>
            {diagnose.isError && <ErrorState error={diagnose.error} onRetry={() => diagnose.mutate()} title="We couldn't explain this post" />}
            <Button className="mt-3" variant="secondary" loading={diagnose.isPending} onClick={() => diagnose.mutate()}><Sparkles className="h-4 w-4" aria-hidden="true" />Explain the numbers only</Button>
          </div>
        )}
        {d && (
          <div className="mt-4 border-t border-line pt-4">
            <DiagnoseView d={d} />
          </div>
        )}
      </Block>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setPanel(panel === 'compare' ? null : 'compare')} aria-expanded={panel === 'compare'}><GitCompareArrows className="h-4 w-4" aria-hidden="true" />Compare with another post</Button>
        {isVideo && <Button variant="secondary" onClick={() => setVideoOpen(true)}><Video className="h-4 w-4" aria-hidden="true" />Analyze the video</Button>}
      </div>

      {panel === 'compare' && (
        <section className="card space-y-4 p-5" aria-label="Compare with another post">
          <h3 className="text-base">Compare with another post</h3>
          <ComparePicker postId={item.id} onPick={(id) => compare.mutate(id)} busy={compare.isPending} />
          {compare.isError && <ErrorState error={compare.error} title="We couldn't compare these posts" />}
          {compare.data && <CompareView result={compare.data} mine={item.id} />}
        </section>
      )}

      {isVideo && <DeepVideoAnalysisModal open={videoOpen} onOpenChange={setVideoOpen} item={{ mediaId: item.id, title: item.title, caption: item.caption }} />}
    </div>
  );
}

function DrawerContent({ postId }: { postId: string }) {
  const q = useMediaItem(postId);
  if (q.isLoading) return <div role="status" aria-label="Loading post" className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} title="We couldn't load this post" />;
  if (!q.data) return null;
  return <PostDetailBody key={q.data.id} item={q.data} />;
}

/** Everything we know about one post, split into what was measured, what was calculated and what it may mean. */
export function PostDetailDrawer({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  return (
    <Drawer open={Boolean(postId)} onOpenChange={(o) => { if (!o) onClose(); }} title="Post details">
      {postId && <DrawerContent postId={postId} />}
    </Drawer>
  );
}
