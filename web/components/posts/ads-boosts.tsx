'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowRight, Megaphone, TrendingUp } from 'lucide-react';
import { apiGet } from '@/lib/api/client';
import { useSync } from '@/lib/hooks/useSync';
import { Button, LinkButton } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { EmptyState, ErrorState, Notice } from '@/components/ui/states';
import { PostGridSkeleton } from '@/components/ui/skeleton';
import { PostThumb } from './post-card';
import type { InstagramAdsPage, NextBoost } from '../../../shared/instagramAds';

const count = (value: number | null) => value === null ? 'Not available' : value.toLocaleString();
/** One post worth putting money behind, with the measured reason and the honest caveat. */
function NextBoostCard({ boost }: { boost: NextBoost }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        {boost.thumbnailUrl && <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line"><PostThumb item={{ platform: 'instagram', title: boost.title, thumbnailUrl: boost.thumbnailUrl, contentType: 'post' }} className="h-full w-full" /></span>}
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-[15px] font-semibold text-ink">{boost.title || 'Untitled post'}</h4>
          <p className="mt-1 text-[13px] text-muted">{boost.reason}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="font-semibold text-ink">{boost.engagementRate}% engagement</span>
        <span>{boost.views.toLocaleString()} views</span>
        <span>{boost.reach.toLocaleString()} reached</span>
      </div>
      <p className="mt-2 text-[12px] text-subtle">{boost.caveat}</p>
    </article>
  );
}

export function AdsBoosts() {
  const [category, setCategory] = useState('all');
  const sync = useSync();
  const feed = useInfiniteQuery({
    queryKey: ['instagram-ads', category], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => apiGet<InstagramAdsPage>('/intelligence/ads', { category, cursor: pageParam }, signal),
    getNextPageParam: last => last.nextCursor ?? undefined, staleTime: 60_000,
  });
  if (feed.isLoading) return <PostGridSkeleton />;
  if (feed.isError) return <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />;
  const first = feed.data?.pages[0];
  if (!first?.connected) return <EmptyState icon={<Megaphone className="h-7 w-7" />} title="Connect Instagram to see ads and boosts" description="Your real paid-content data will appear after you connect and sync an account with advertising access." action={<LinkButton href="/connections">Connect Instagram</LinkButton>} />;
  const items = feed.data?.pages.flatMap(p => p.items) ?? [];
  const nextBoosts = feed.data?.pages[0]?.nextBoosts ?? [];
  const boostedIds = feed.data?.pages[0]?.boostedMediaIds ?? [];
  const status = first.sync;
  const blocked = status?.status === 'permission_required';
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Instagram Ads / Boosts</h2><p className="mt-1 max-w-2xl text-sm text-muted">Paid delivery on Instagram. These figures stay separate from your post rankings and totals.</p></div>
      <Button variant="secondary" loading={sync.active.length > 0} onClick={() => void sync.start('instagram')}>Sync Instagram</Button>
    </div>
    {status ? <Notice tone={status.status === 'ready' ? 'info' : 'warn'}>
      <p>{status.message}</p>
      <p className="mt-1">Last attempt: {new Date(status.checkedAt).toLocaleString()}. Older saved ads remain visible with their last synced time.</p>
      {blocked && <LinkButton href="/connections" className="mt-3" size="sm" variant="secondary">Update connection</LinkButton>}
    </Notice> : <Notice>Sync Instagram to check for ads and boosted posts. No paid data has been retrieved yet.</Notice>}
    <label className="flex items-center gap-3 text-sm font-medium">Show
      <Select value={category} onChange={e => setCategory(e.target.value)} className="w-auto pr-10">
        <option value="all">All ads and boosts</option><option value="boosted_post">Promoted posts / Boosts</option><option value="ad">Ads</option>
      </Select>
    </label>
    <p className="text-xs text-muted">
      A <strong>boost</strong> promotes a post that already exists in your library, so it is counted here and marked as boosted on that post.
      An <strong>ad</strong> runs its own creative instead. Meta does not always say which one it was, so a promotion of a post that is not in your
      library is shown as an ad. Missing metrics are shown as unavailable rather than guessed.
    </p>
    {nextBoosts.length > 0 && (
      <section aria-label="Recommended next boosts">
        <h3 className="mb-1 flex items-center gap-2 text-[15px] font-bold uppercase tracking-wider text-brand-600">
          <TrendingUp className="h-4 w-4" aria-hidden="true" />Next ads / boosts to try
        </h3>
        <p className="mb-3 max-w-2xl text-sm text-muted">
          These are your own strongest posts that are not being boosted right now, with the measured reason each one is a candidate.
          Paid results still depend on budget, audience and placement, not on the post alone.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {nextBoosts.map((b) => <NextBoostCard key={b.mediaId} boost={b} />)}
        </div>
      </section>
    )}
    {!items.length ? <EmptyState
      title={blocked ? 'Advertising access is needed' : category === 'boosted_post' ? 'No boosts of your posts' : status?.status === 'ready' ? 'No matching ads returned' : 'No paid data available yet'}
      description={blocked
        ? 'Your current connection can still sync regular posts. Update its advertising access to retrieve paid results.'
        : category === 'boosted_post'
          ? 'Meta returned ads that run their own creative rather than promoting a post from your library. Choose “Ads” to see them.'
          : 'Only ads Meta attributes to your connected Instagram profile are shown. Try syncing or choose another category.'} /> :
      <div className="grid gap-5 lg:grid-cols-2">{items.map(ad => <article key={`${ad.adAccountId}:${ad.id}`} className="min-w-0 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          <span className={`rounded-md px-2 py-1 font-semibold ${ad.category === 'boosted_post' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-brand-50 text-brand-700'}`}>
            {ad.category === 'boosted_post' ? 'Boost of a post' : 'Ad (own creative)'}
          </span>
          <span className="py-1">{ad.status.replaceAll('_', ' ')}</span>
        </div>
        <h3 className="mt-3 break-words text-lg">{ad.name}</h3>
        <p className="mt-1 break-words text-sm text-muted">{[ad.campaign, ad.adSet].filter(Boolean).join(' · ') || 'Campaign details unavailable'}</p>
        {ad.category === 'boosted_post' && ad.sourceMediaId && (
          <p className="mt-1 text-[13px] text-muted">Promotes one of your posts (media {ad.sourceMediaId}).</p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">{[
          ['Impressions', count(ad.impressions)], ['Reach', count(ad.reach)], ['Clicks', count(ad.clicks)],
          ['Spend', ad.spend === null ? 'Not available' : `${ad.currency ?? ''} ${ad.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words font-semibold tabular-nums">{value}</dd></div>)}</dl>
        <p className="mt-4 text-xs text-muted">{ad.dateStart && ad.dateStop ? `Reporting period: ${ad.dateStart} – ${ad.dateStop}` : 'No Instagram delivery metrics returned for this ad.'}</p>
        <p className="mt-1 text-xs text-muted">Synced {new Date(ad.syncedAt).toLocaleString()}</p>
      </article>)}</div>}
    {feed.hasNextPage && <Button variant="secondary" loading={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>Show more ads</Button>}
    {feed.isFetchNextPageError && <Notice tone="warn">More ads could not be loaded. Please try again.</Notice>}
  </div>;
}
