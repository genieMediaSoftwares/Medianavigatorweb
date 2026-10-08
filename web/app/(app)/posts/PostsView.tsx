'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FileText, Search, Sparkles } from 'lucide-react';
import { mediaApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { CLASSIFICATION, PLATFORM_LABEL, formatLabel } from '@/lib/copy';
import { formatChange, formatCompact, formatDate, formatPercent } from '@/lib/format';
import { classify, MIN_HISTORY } from '@/lib/performance';
import { connectedOnly, useConnections, useMe, useSummary } from '@/lib/hooks';
import { useChannel } from '@/components/providers/AppContext';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { FilterSelect } from '@/components/ui/Field';
import { HelpPopover } from '@/components/ui/Help';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/States';
import { PostCard } from '@/components/posts/PostCard';
import { PostDrawer } from '@/components/posts/PostDrawer';
import type { RankedItem, Summary } from '@/types/api';

type Tab = 'all' | 'working' | 'attention';
const PAGE_SIZE = 24;

export function PostsView() {
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'working' ? 'working' : params.get('tab') === 'attention' ? 'attention' : 'all';
  const [openPost, setOpenPost] = useState<string | null>(null);
  const connections = useConnections();
  const hasConnected = connectedOnly(connections.data).length > 0;

  return (
    <>
      <PageHeader title="Posts" description="Every post we've imported, and how each one compares with your usual." />
      <Tabs
        label="Post views"
        items={[
          { href: '/posts', label: 'All', active: tab === 'all' },
          { href: '/posts?tab=working', label: "What's working", active: tab === 'working' },
          { href: '/posts?tab=attention', label: 'Needs attention', active: tab === 'attention' },
        ]}
      />
      {connections.isSuccess && !hasConnected ? (
        <EmptyState icon={<FileText className="size-6" />} title="No channels connected" body="Connect a channel and we'll import your posts." action={<ButtonLink href="/connections">Connect a channel</ButtonLink>} />
      ) : tab === 'all' ? (
        <AllPosts onOpen={setOpenPost} />
      ) : (
        <Ranked kind={tab} onOpen={setOpenPost} />
      )}
      <PostDrawer mediaId={openPost} onClose={() => setOpenPost(null)} />
    </>
  );
}

type Sort = 'newest' | 'views' | 'engagement';

function AllPosts({ onOpen }: { onOpen: (id: string) => void }) {
  const { channel } = useChannel();
  const tz = useMe().data?.profile?.timezone;
  const summary = useSummary('all', 30);
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search.trim().toLowerCase());
  const [format, setFormat] = useState('all');
  const [sort, setSort] = useState<Sort>('newest');

  const media = useInfiniteQuery({
    queryKey: qk.media(channel),
    queryFn: ({ pageParam }) => mediaApi.page({ platform: channel === 'all' ? undefined : channel, cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const all = useMemo(() => media.data?.pages.flatMap((p) => p.items) ?? [], [media.data]);
  const formats = useMemo(() => [...new Set(all.map((m) => m.contentType))].sort(), [all]);
  const shown = useMemo(() => {
    const list = all.filter((m) => (format === 'all' || m.contentType === format) && (!query || `${m.title} ${m.caption ?? ''}`.toLowerCase().includes(query)));
    if (sort === 'views') return [...list].sort((a, b) => b.views - a.views);
    if (sort === 'engagement') return [...list].sort((a, b) => b.engagementRate - a.engagementRate);
    return list; // the API returns newest first
  }, [all, format, query, sort]);

  if (media.isPending) return <ListSkeleton />;
  // A failed "Show more" keeps the posts already loaded; only a failed first page replaces the list.
  if (media.isError && !media.data) return <ErrorState error={media.error} onRetry={() => media.refetch()} />;
  if (all.length === 0) {
    return <EmptyState icon={<FileText className="size-6" />} title="No posts yet" body="Once your channels finish importing, your posts will appear here." action={<ButtonLink href="/connections">Check import progress</ButtonLink>} />;
  }

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 basis-60 flex-col gap-1 text-sm font-semibold text-ink-muted">
          Search
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles and captions"
              className="min-h-11 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface pl-9 pr-3 text-[16px] font-normal text-ink"
            />
          </span>
        </label>
        <FilterSelect label="Format" value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="all">All formats</option>
          {formats.map((f) => <option key={f} value={f}>{formatLabel(f)}</option>)}
        </FilterSelect>
        <FilterSelect label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="newest">Newest</option>
          <option value="views">Most views</option>
          <option value="engagement">Best engagement</option>
        </FilterSelect>
      </div>
      {sort !== 'newest' && media.hasNextPage ? <p className="mb-3 text-sm text-ink-subtle">Sorted among the {all.length} posts loaded so far. Load more to include older posts.</p> : null}

      {shown.length === 0 ? (
        <EmptyState title="No posts match" body="Try a different search or format." action={<Button variant="secondary" onClick={() => { setSearch(''); setFormat('all'); }}>Clear filters</Button>} />
      ) : (
        <ul className="space-y-3">
          {shown.map((m) => (
            <li key={m.id}>
              <PostCard media={m} tz={tz} onOpen={onOpen} classification={classify(m.engagementRate, summary.data?.baselines[m.platform])} />
            </li>
          ))}
        </ul>
      )}
      {media.hasNextPage ? (
        <div className="mt-6 text-center">
          <Button variant="secondary" loading={media.isFetchingNextPage} onClick={() => media.fetchNextPage()}>Show more</Button>
        </div>
      ) : null}
      {media.isFetchNextPageError ? <ErrorState className="mt-4" error={media.error} onRetry={() => media.fetchNextPage()} /> : null}
    </>
  );
}

function Ranked({ kind, onOpen }: { kind: 'working' | 'attention'; onOpen: (id: string) => void }) {
  const { channel } = useChannel();
  const summary = useSummary(channel, 30);
  if (summary.isPending) return <ListSkeleton />;
  if (summary.isError) return <ErrorState error={summary.error} onRetry={() => summary.refetch()} />;
  const s = summary.data;
  const items = kind === 'working' ? s.topContent : s.needsImprovement;
  const thin = s.insufficientHistory as Array<keyof typeof PLATFORM_LABEL>;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink-muted">
          {kind === 'working'
            ? 'Posts that clearly beat your usual results on the same channel.'
            : 'Posts that did noticeably less than your usual. Every channel has these; they\'re where the easiest wins hide.'}
        </p>
        <HelpPopover>
          <p>Each post is compared only with your own posts on the same channel. &ldquo;Your typical&rdquo; is the median engagement.</p>
          <p>Doing well: in your top quarter and at least 1.25× typical. Could be better: in your bottom quarter and at most 0.75× typical.</p>
          <p>We need at least {MIN_HISTORY} posts on a channel before ranking anything there.</p>
        </HelpPopover>
      </div>
      {thin.length ? (
        <p className="mb-4 rounded-xl bg-neutral-bg px-3 py-2 text-[15px] text-neutral-fg">
          Not enough data yet on {thin.map((p) => PLATFORM_LABEL[p] ?? p).join(', ')}: we need at least {MIN_HISTORY} posts there before ranking.
        </p>
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title={kind === 'working' ? 'Nothing stands out yet' : 'Nothing needs attention'}
          body={kind === 'working' ? 'No post is clearly above your usual yet. Keep posting; standouts show up as your history grows.' : 'None of your posts are clearly below your usual. Keep it up.'}
          action={<ButtonLink href="/posts" variant="secondary">See all posts</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}><RankedCard item={item} summary={s} kind={kind} onOpen={onOpen} /></li>
          ))}
        </ul>
      )}
    </>
  );
}

function RankedCard({ item, summary, kind, onOpen }: { item: RankedItem; summary: Summary; kind: 'working' | 'attention'; onOpen: (id: string) => void }) {
  const tz = useMe().data?.profile?.timezone;
  const typical = summary.baselines[item.platform]?.medianEngagementRate;
  const tag = CLASSIFICATION[item.classification];
  const name = PLATFORM_LABEL[item.platform];
  const diff = item.vsMedianEngagementPct;
  const why = diff === null
    ? `Engagement was ${formatPercent(item.engagementRate)}.`
    : kind === 'working'
      ? `Engagement was ${formatChange(diff)} compared with your typical ${name} post.`
      : `Engagement was ${formatChange(diff)} compared with your typical ${name} post. Worth a second look: a different opening line or posting time may help.`;
  return (
    <article className="card rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <button type="button" onClick={() => onOpen(item.id)} className="w-full rounded-[var(--radius-card)] p-4 text-left hover:bg-surface-2">
        <div className="flex flex-wrap items-center gap-2">
          <PlatformIcon platform={item.platform} className="size-5" />
          <span className="text-sm font-semibold text-ink-muted">{formatLabel(item.contentType)} · {formatDate(item.publishedAt, tz)}</span>
          <Badge tone={tag.tone} className="ml-auto">{tag.label}</Badge>
        </div>
        <h3 className="mt-1.5 line-clamp-2 font-semibold">{item.title || 'Untitled post'}</h3>
        <p className="mt-1 text-[15px] text-ink-muted">{why}</p>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-ink-muted">This post</dt><dd className="font-semibold">{formatPercent(item.engagementRate)} engagement</dd></div>
          {typical !== undefined ? <div><dt className="text-ink-muted">Your typical</dt><dd className="font-semibold">{formatPercent(typical)}</dd></div> : null}
          {/* The API flags Facebook views as unavailable when the page did not report them (ranked items carry no flag list). */}
          <div><dt className="text-ink-muted">Views</dt><dd className="font-semibold">{item.platform === 'facebook' && item.views === 0 ? `Not available from ${name}` : formatCompact(item.views)}</dd></div>
          <div><dt className="text-ink-muted">Likes · Comments</dt><dd className="font-semibold">{formatCompact(item.likes)} · {formatCompact(item.comments)}</dd></div>
        </dl>
      </button>
    </article>
  );
}
