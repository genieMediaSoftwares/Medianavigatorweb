'use client';

import { ArrowRight, CalendarCheck, Clock, LayoutGrid, Sparkles, Loader2, Eye, FileText, Activity } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PostCard } from '@/components/posts/post-card';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { PlatformIcon, PlatformTile } from '@/components/ui/platform-logo';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Notice } from '@/components/ui/states';
import { compact, percent, timeAgo, whole } from '@/lib/format';
import { useMediaItem } from '@/lib/hooks/usePosts';
import { tagFor, type PostTag } from '@/lib/performance';
import { platformName } from '@/lib/platforms';
import { PLATFORMS, type Connection, type KeySignal, type Platform, type SlimPost, type Summary, type SyncRun } from '@/types/api';

const PLATFORM_BLURB: Record<Platform, string> = {
  instagram: 'Photos, carousels and Reels',
  youtube: 'Videos and Shorts',
  facebook: 'Page posts and videos',
  linkedin: 'Company and profile posts',
};

/** (a) Nothing connected yet. */
export function WelcomeState() {
  return (
    <div className="space-y-8">
      <Card className="text-center sm:p-10">
        <h2 className="text-2xl">Welcome to Media Navigator</h2>
        <p className="mx-auto mt-2 max-w-xl text-[15px] text-muted">Connect one account and we will tell you, in plain words, what is working, what to fix and when to post. We only read your posts. We never post, edit or delete anything.</p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLATFORMS.map((p) => (
          <div key={p} className="card flex flex-col items-center gap-3 p-6 text-center">
            <PlatformTile platform={p} size="lg" />
            <div>
              <h3 className="text-base">{platformName(p)}</h3>
              <p className="mt-1 text-sm text-muted">{PLATFORM_BLURB[p]}</p>
            </div>
            <LinkButton href="/connections" variant="secondary" size="sm" className="mt-auto w-full" aria-label={`Connect ${platformName(p)}`}>Connect</LinkButton>
          </div>
        ))}
      </div>
    </div>
  );
}

/** (b) Connected, but no posts imported yet. */
export function ImportingState({ connections, runs, syncing, onSync }: { connections: Connection[]; runs: Partial<Record<Platform, SyncRun>>; syncing: boolean; onSync: () => void }) {
  return (
    <Card className="mx-auto max-w-2xl text-center sm:p-10">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        {syncing ? <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" /> : <Sparkles className="h-7 w-7" aria-hidden="true" />}
      </div>
      <h2 className="text-2xl">{syncing ? "We're importing your posts" : 'No posts to show yet'}</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">
        {syncing ? "We're importing your posts. This can take a few minutes. You can leave this page and come back." : "Your account is connected, but we haven't found any posts yet. Update now to check again."}
      </p>
      <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left" aria-live="polite">
        {connections.map((c) => {
          const run = runs[c.platform];
          const detail = run && (run.status === 'queued' || run.status === 'running') ? (run.items.fetched > 0 ? `${whole(run.items.fetched)} posts found so far` : 'Starting…') : c.dataPointsCount > 0 ? `${whole(c.dataPointsCount)} posts` : 'Waiting for posts';
          return (
            <li key={c.platform} className="flex items-center gap-3 rounded-xl bg-app px-4 py-3">
              <PlatformIcon platform={c.platform} className="h-6 w-6" />
              <span className="font-semibold text-ink">{platformName(c.platform)}</span>
              <span className="ml-auto text-sm text-muted">{detail}</span>
            </li>
          );
        })}
      </ul>
      {!syncing && <Button className="mt-6" onClick={onSync}>Update now</Button>}
    </Card>
  );
}

export function UpdatedLine({ connections, syncing }: { connections: Connection[]; syncing: boolean }) {
  if (connections.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted" aria-label="When each channel was last updated">
      {connections.map((c) => (
        <li key={c.platform} className="flex items-center gap-2">
          <PlatformIcon platform={c.platform} className="h-4 w-4" />
          <span>{platformName(c.platform)}: {syncing ? 'Updating…' : `Updated ${timeAgo(c.sync?.lastSyncedAt ?? c.lastSyncedAt)}`}</span>
        </li>
      ))}
    </ul>
  );
}

const pctChange = (now: number, before: number): number | null => (before > 0 ? ((now - before) / before) * 100 : null);

function deltaText(delta: number | null, comparable: boolean): string {
  if (!comparable || delta === null) return 'Not enough earlier posts to compare yet.';
  const r = Math.round(Math.abs(delta));
  if (r < 1) return 'About the same as the 30 days before.';
  return `${delta > 0 ? 'Up' : 'Down'} ${r}% from the 30 days before.`;
}

export function StatRow({ summary }: { summary: Summary }) {
  const { current, previous } = summary.dataPeriod;
  const comparable = summary.periodComparison.comparable;
  const none = current.count === 0;
  const postsDelta = comparable ? pctChange(current.count, previous.count) : null;
  const viewsDelta = comparable ? pctChange(current.totalViews, previous.totalViews) : null;
  const engDelta = comparable ? summary.periodComparison.engagementRateMedianChangePct : null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Posts published" icon={<FileText className="h-5 w-5" />} value={whole(current.count)} delta={postsDelta}
        meaning={none ? "You didn't publish any posts in the last 30 days." : `Posts you shared in the last 30 days. ${deltaText(postsDelta, comparable)}`} />
      <StatCard label="Total views" icon={<Eye className="h-5 w-5" />} value={none ? 'N/A' : compact(current.totalViews)} delta={none ? null : viewsDelta}
        meaning={none ? 'There are no posts in this period to count.' : `A typical post got ${compact(current.medianViews)} views. ${deltaText(viewsDelta, comparable)}`} />
      <StatCard label="Typical engagement" icon={<Activity className="h-5 w-5" />} value={none ? 'N/A' : percent(current.medianEngagementRate)} delta={none ? null : engDelta}
        meaning={none ? 'There are no posts in this period to measure.' : `How much people react to a typical post of yours. ${deltaText(engDelta, comparable)}`} />
    </div>
  );
}

const SIGNAL_LINK: Record<string, { href: string; Icon: typeof Clock }> = {
  content: { href: '/posts', Icon: LayoutGrid },
  timing: { href: '/best-times', Icon: Clock },
  plan: { href: '/plan', Icon: CalendarCheck },
};
export const signalLink = (target: string) => SIGNAL_LINK[target] ?? { href: '/insights', Icon: Sparkles };

export function SignalList({ signals, scopeNote }: { signals: KeySignal[]; scopeNote?: string }) {
  if (signals.length === 0) return null;
  return (
    <section aria-labelledby="signals-h">
      <SectionHeader title="Signals" description={scopeNote ?? 'A few things worth knowing right now.'} />
      <ul className="grid gap-4 lg:grid-cols-3">
        {signals.slice(0, 3).map((s) => {
          const { href, Icon } = signalLink(s.actionTarget);
          return (
            <li key={s.id} className="card flex flex-col gap-3 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden="true"><Icon className="h-5 w-5" /></span>
              <div>
                <p className="eyebrow">{s.category}</p>
                <h3 className="mt-1 text-base">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.description}</p>
              </div>
              <Link href={href} className="mt-auto inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">{s.actionText}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Loads the full post so the real thumbnail shows, then reuses the Posts card. */
export function FeaturedPost({ title, post, summary, line, tagOverride, onOpen, empty }: { title: string; post: SlimPost | undefined; summary: Summary; line: ReactNode; tagOverride?: PostTag; onOpen: (id: string) => void; empty: string }) {
  const full = useMediaItem(post?.id);
  return (
    <section className="flex flex-col">
      <SectionHeader title={title} />
      {!post ? (
        <Card className="flex-1"><p className="text-[15px] text-muted">{empty}</p></Card>
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-[15px] text-muted">{line}</p>
          {full.isLoading && <Skeleton className="h-96 rounded-2xl" />}
          {full.isError && <Notice tone="warn">We couldn&apos;t load this post&apos;s picture. <button className="font-semibold underline" onClick={() => void full.refetch()}>Try again</button></Notice>}
          {full.data && <div className="max-w-sm"><PostCard item={full.data} tag={tagOverride ?? tagFor(full.data, summary)} onOpen={() => onOpen(post.id)} /></div>}
        </div>
      )}
    </section>
  );
}
