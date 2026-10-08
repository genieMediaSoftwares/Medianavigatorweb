'use client';

import { LayoutGrid, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { PostGridSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, Notice } from '@/components/ui/states';
import { PlatformIcon } from '@/components/ui/platform-logo';
import { Segmented, TabBar } from '@/components/ui/tabs';
import { compact, dateShort, percent, whole } from '@/lib/format';
import { useChannel } from '@/lib/hooks/useChannel';
import { usePerformers, usePostsFeed } from '@/lib/hooks/usePosts';
import { useConnections, useSummary } from '@/lib/hooks/useQueries';
import { useSync } from '@/lib/hooks/useSync';
import { tagFor } from '@/lib/performance';
import { platformName, typeLabel } from '@/lib/platforms';
import type { ContentType, MediaItem, Performer, PerformerSort, Platform } from '@/types/api';
import { PostCard, PostThumb } from './post-card';
import { PostDetailDrawer } from './post-detail-drawer';
import { plainComparison } from './plain-language';

type Tab = 'all' | 'working' | 'attention';
const TABS = [{ id: 'all', label: 'All' }, { id: 'working', label: "What's working" }, { id: 'attention', label: 'Needs attention' }];
type AllSort = 'newest' | 'views' | 'engagement';
const ALL_SORTS: Array<{ value: AllSort; label: string }> = [{ value: 'newest', label: 'Newest' }, { value: 'views', label: 'Most views' }, { value: 'engagement', label: 'Best engagement' }];
const RANK_SORTS: Array<{ value: PerformerSort; label: string }> = [{ value: 'views', label: 'Most views' }, { value: 'engagement', label: 'Best engagement' }, { value: 'likes', label: 'Most likes' }, { value: 'comments', label: 'Most comments' }];
const RANK_PAGE = 9;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

const KNOWN_TYPES: ContentType[] = ['reel', 'short', 'video', 'post', 'article', 'carousel'];
const asType = (t: string): ContentType => KNOWN_TYPES.find((k) => k === t) ?? 'post';
const sentence = (s: string) => { const t = s.trim(); return /[.!?)]$/.test(t) ? t : `${t}.`; };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function RankedCard({ p, kind, rank, onOpen }: { p: Performer; kind: 'working' | 'attention'; rank: number; onOpen: () => void }) {
  const why = `${cap(sentence(plainComparison(p.baselineComparison)))} It got ${whole(p.views)} views and ${percent(p.engagementRate)} engagement.`;
  return (
    <article className="card flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
      <button onClick={onOpen} aria-label={`Open ${p.title || 'post'}`} className="w-full shrink-0 self-start overflow-hidden rounded-xl border border-line sm:w-32">
        <PostThumb item={{ platform: p.platform, title: p.title, thumbnailUrl: p.thumbnailUrl ?? '', contentType: asType(p.contentType) }} className="!aspect-video" />
      </button>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-600 tabular" aria-label={`Number ${rank}`}>{rank}</span>
          <PlatformIcon platform={p.platform} className="h-5 w-5" /><span>{platformName(p.platform)} · {typeLabel(p.contentType)}</span>
          <span aria-hidden="true">·</span><span>{dateShort(p.publishedAt)}</span>
        </div>
        <h3 className="line-clamp-2 text-base">{p.title || p.caption || 'Untitled post'}</h3>
        <p className="text-[15px] text-ink">{why}</p>
        <div className="rounded-xl bg-brand-50 px-4 py-3 text-[15px] text-brand-800">
          <span className="font-semibold">{kind === 'working' ? 'Try next: ' : 'A gentle next step: '}</span>{p.patternToReplicateOrImprove}
        </div>
        {kind === 'attention' && p.uncertaintyNote && <p className="text-sm text-muted">{p.uncertaintyNote}</p>}
        {p.possibleFactors.length > 0 && (
          <details className="text-sm text-muted">
            <summary className="min-h-11 cursor-pointer py-2.5 font-semibold text-brand-600">Show details</summary>
            <ul className="list-disc space-y-1 pl-5">{p.possibleFactors.map((f) => <li key={f}>{f}</li>)}</ul>
          </details>
        )}
        <Button variant="secondary" size="sm" onClick={onOpen}>See this post</Button>
      </div>
    </article>
  );
}

function RankedList({ kind, channel, query, format, onOpen }: { kind: 'working' | 'attention'; channel: Platform | 'all'; query: string; format: string; onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<PerformerSort>('views');
  const [shown, setShown] = useState(RANK_PAGE);
  const summary = useSummary(channel, 365);
  const perf = usePerformers(sort);
  const insufficient = useMemo(() => new Set(summary.data?.insufficientHistory ?? []), [summary.data]);

  const list = useMemo(() => {
    const src = perf.data ? (kind === 'working' ? perf.data.top : perf.data.bottom) : [];
    const q = query.trim().toLowerCase();
    return src.filter((p) => (channel === 'all' || p.platform === channel) && !insufficient.has(p.platform)
      && (format === 'all' || p.contentType === format)
      && (!q || `${p.title} ${p.caption ?? ''}`.toLowerCase().includes(q)));
  }, [perf.data, kind, channel, insufficient, format, query]);

  if (perf.isLoading || summary.isLoading) return <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>;
  if (perf.isError) return <ErrorState error={perf.error} onRetry={() => void perf.refetch()} />;

  const allSrc = perf.data ? (kind === 'working' ? perf.data.top : perf.data.bottom) : [];
  const tooFew = allSrc.length === 0 || (insufficient.size > 0 && allSrc.every((p) => insufficient.has(p.platform)))
    || (channel !== 'all' && insufficient.has(channel));
  const filtering = Boolean(query.trim()) || format !== 'all';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-[15px] text-muted">
          {kind === 'working' ? 'These posts did better than your usual. See what they have in common and do more of it.' : 'Every account has quieter posts. These are the ones with the most room to grow, with an idea for each.'}
        </p>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">Rank by
          <Select value={sort} onChange={(e) => { setSort(e.target.value as PerformerSort); setShown(RANK_PAGE); }} className="w-auto pr-10">
            {RANK_SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </label>
      </div>
      {insufficient.size > 0 && !tooFew && <Notice tone="info">We need a few more posts on {[...insufficient].map(platformName).join(' and ')} before we can say. Those posts are left out for now.</Notice>}
      {tooFew ? (
        <EmptyState icon={<LayoutGrid className="h-7 w-7" aria-hidden="true" />} title="We need a few more posts before we can say"
          description="Once you have at least five posts on a channel, we can show what is working and what could be better, compared with your own usual."
          action={<LinkButton href="/connections" variant="secondary">Manage connections</LinkButton>} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Search className="h-7 w-7" aria-hidden="true" />} title={filtering ? 'No posts match your search' : 'Nothing to show here yet'} description={filtering ? 'Try a different word, or clear the format filter.' : 'Check back after your next update.'} />
      ) : (
        <>
          <div className="space-y-4">{list.slice(0, shown).map((p, i) => <RankedCard key={p.id} p={p} kind={kind} rank={i + 1} onOpen={() => onOpen(p.mediaId)} />)}</div>
          {list.length > shown && <div className="flex justify-center"><Button variant="secondary" onClick={() => setShown((n) => n + RANK_PAGE)}>Show more</Button></div>}
        </>
      )}
    </div>
  );
}

function AllPosts({ channel, query, format, onOpen }: { channel: Platform | 'all'; query: string; format: string; onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<AllSort>('newest');
  const feed = usePostsFeed(channel);
  const summary = useSummary(channel, 365);
  const sync = useSync();
  const all = useMemo<MediaItem[]>(() => feed.data?.pages.flatMap((p) => p.items) ?? [], [feed.data]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = all.filter((p) => (format === 'all' || p.contentType === format) && (!q || `${p.title} ${p.caption}`.toLowerCase().includes(q)));
    return [...f].sort((a, b) => sort === 'views' ? b.views - a.views : sort === 'engagement' ? b.engagementRate - a.engagementRate : +new Date(b.publishedAt) - +new Date(a.publishedAt));
  }, [all, query, format, sort]);

  if (feed.isLoading) return <PostGridSkeleton />;
  if (feed.isError) return <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />;
  if (all.length === 0 && !feed.hasNextPage) {
    return <EmptyState icon={<LayoutGrid className="h-7 w-7" aria-hidden="true" />} title="No posts yet"
      description="Your account is connected, but we haven't imported any posts. Update now to check again. This can take a few minutes."
      action={<Button onClick={() => void sync.start(channel === 'all' ? 'all' : channel)} loading={sync.active.length > 0}>Update now</Button>} />;
  }
  const total = feed.data?.pages[0]?.total;
  const filtering = Boolean(query.trim()) || format !== 'all';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {filtering ? `${items.length} of ${all.length} loaded posts` : total !== undefined ? `Showing ${all.length} of ${total} posts` : `${all.length} posts`}
        </p>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">Sort by
          <Select value={sort} onChange={(e) => setSort(e.target.value as AllSort)} className="w-auto pr-10">
            {ALL_SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </label>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Search className="h-7 w-7" aria-hidden="true" />} title="No posts match your search" description={feed.hasNextPage ? 'Try a different word, or show more posts to search further back.' : 'Try a different word, or clear the format filter.'}
          action={feed.hasNextPage ? <Button variant="secondary" loading={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>Show more posts</Button> : undefined} />
      ) : (
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {items.map((p) => <PostCard key={p.id} item={p} tag={tagFor(p, summary.data)} onOpen={() => onOpen(p.id)} />)}
        </div>
      )}
      {feed.hasNextPage && items.length > 0 && <div className="flex justify-center"><Button variant="secondary" loading={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>Show more</Button></div>}
      {feed.isFetchNextPageError && <Notice tone="warn">We couldn&apos;t load more posts. Please try again.</Notice>}
    </div>
  );
}

export function PostsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = tabParam === 'working' || tabParam === 'attention' ? tabParam : 'all';
  const { channel, setChannel } = useChannel();
  const connections = useConnections();
  const [search, setSearch] = useState('');
  const query = useDebounced(search, 300);
  const [format, setFormat] = useState('all');
  const feedForFormats = usePostsFeed(channel);
  const formats = useMemo<string[]>(() => [...new Set<string>((feedForFormats.data?.pages.flatMap((p) => p.items) ?? []).map((p) => p.contentType))].sort(), [feedForFormats.data]);
  const [open, setOpen] = useState<string | null>(null);

  const connected = (connections.data ?? []).filter((c) => c.connected);
  const setTab = (id: string) => { const sp = new URLSearchParams(params.toString()); if (id === 'all') sp.delete('tab'); else sp.set('tab', id); const qs = sp.toString(); router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }); };

  // If the chosen format does not exist on this channel, go back to all formats.
  const formatOptions = format !== 'all' && !formats.includes(format) ? [...formats, format] : formats;

  let body;
  if (connections.isLoading) body = <PostGridSkeleton />;
  else if (connections.isError) body = <ErrorState error={connections.error} onRetry={() => void connections.refetch()} />;
  else if (connected.length === 0) {
    body = <EmptyState icon={<LayoutGrid className="h-7 w-7" aria-hidden="true" />} title="No account connected yet" description="Connect an account and your posts will show up here. Media Navigator only reads your posts. It never posts, edits or deletes anything."
      action={<LinkButton href="/connections">Connect an account</LinkButton>} />;
  } else {
    body = (
      <div className="space-y-6">
        <TabBar label="Post views" tabs={TABS} value={tab} onChange={setTab} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
            <Input type="search" aria-label="Search posts" placeholder="Search your posts" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select aria-label="Format" value={format} onChange={(e) => setFormat(e.target.value)} className="w-auto pr-10">
            <option value="all">All formats</option>
            {formatOptions.map((f) => <option key={f} value={f}>{typeLabel(f)}</option>)}
          </Select>
          {connected.length > 1 && (
            <Segmented<Platform | 'all'> label="Channel" value={channel} onChange={setChannel}
              options={[{ value: 'all', label: 'All' }, ...connected.map((c) => ({ value: c.platform, label: platformName(c.platform) }))]} />
          )}
        </div>
        {tab === 'all'
          ? <AllPosts channel={channel} query={query} format={format} onOpen={setOpen} />
          : <RankedList kind={tab} channel={channel} query={query} format={format} onOpen={setOpen} />}
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Posts" subtitle="Every post we've imported, with a plain note on how it is doing compared with your usual." />
      {body}
      <PostDetailDrawer postId={open} onClose={() => setOpen(null)} />
    </>
  );
}

