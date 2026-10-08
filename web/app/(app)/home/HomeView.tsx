'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Hourglass, Lightbulb, Target } from 'lucide-react';
import { intelligenceApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { CLASSIFICATION, PLATFORM_LABEL, formatLabel } from '@/lib/copy';
import { formatChange, formatCompact, formatDate, formatNumber, formatPercent, timeAgo } from '@/lib/format';
import { connectedOnly, useConnections, useMe, useSummary } from '@/lib/hooks';
import { useChannel } from '@/components/providers/AppContext';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { HelpPopover } from '@/components/ui/Help';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { StatCard } from '@/components/ui/Stat';
import { CardsSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { OAuthConnectButton } from '@/components/connections/ConnectActions';
import { PostDrawer } from '@/components/posts/PostDrawer';
import type { Connection, KeySignal, RankedItem } from '@/types/api';

const SIGNAL_LINK: Record<string, { href: string; label: string }> = {
  content: { href: '/posts?tab=working', label: "See what's working" },
  timing: { href: '/best-times', label: 'See best times' },
  recommendations: { href: '/plan', label: 'See ideas' },
};
const SIGNAL_ICON: Record<string, typeof Target> = { "What's working": Target, 'Best time': Clock, 'New opportunity': Lightbulb };

export function HomeView() {
  const me = useMe();
  const connections = useConnections();
  const firstName = me.data?.profile?.fullName.split(' ')[0];

  if (connections.isPending) return <HomeSkeleton />;
  if (connections.isError) return <ErrorState error={connections.error} onRetry={() => connections.refetch()} />;

  const connected = connectedOnly(connections.data);
  if (connected.length === 0) return <Welcome name={firstName} connections={connections.data} />;
  return <Dashboard name={firstName} connections={connections.data} />;
}

function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <CardsSkeleton className="mt-8" />
      <CardsSkeleton className="mt-6" count={2} />
    </div>
  );
}

function Welcome({ name, connections }: { name?: string; connections: Connection[] }) {
  return (
    <>
      <PageHeader
        title={name ? `Welcome, ${name}` : 'Welcome'}
        description="Connect one channel to begin. We'll import your posts and show you what's working, in plain language."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {connections.map((c) => (
          <Card key={c.platform} className="flex flex-col">
            <div className="flex items-center gap-3">
              <PlatformIcon platform={c.platform} decorative className="size-9" />
              <h2 className="text-lg font-semibold">{c.name}</h2>
            </div>
            <p className="mt-2 flex-1 text-ink-muted">Read-only access. We can&apos;t post, edit or delete anything.</p>
            <div className="mt-4">
              {c.oauthAvailable ? (
                <OAuthConnectButton platform={c.platform} />
              ) : (
                <ButtonLink href={`/connections#${c.platform}`}>Connect {c.name}</ButtonLink>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function Dashboard({ name, connections }: { name?: string; connections: Connection[] }) {
  const { channel } = useChannel();
  const overview = useQuery({ queryKey: qk.overview, queryFn: intelligenceApi.overview });
  const summary = useSummary(channel, 30);
  const [openPost, setOpenPost] = useState<string | null>(null);
  const connected = connectedOnly(connections);

  if (overview.isPending || summary.isPending) return <HomeSkeleton />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => overview.refetch()} />;
  if (summary.isError) return <ErrorState error={summary.error} onRetry={() => summary.refetch()} />;

  if (!overview.data.hasData) {
    const importing = connected.some((c) => c.status === 'syncing' || c.status === 'connecting');
    return (
      <>
        <PageHeader title={name ? `Hi, ${name}` : 'Hi'} />
        <EmptyState
          icon={<Hourglass className="size-6" />}
          title={importing ? "We're importing your posts" : 'No posts found yet'}
          body={importing
            ? 'This can take a few minutes. You can leave this page; we\'ll keep working and update everything when it\'s done.'
            : 'Your channels are connected, but we haven\'t found any published posts yet. Once you publish, run a sync to bring them in.'}
          action={<ButtonLink href="/connections" variant={importing ? 'secondary' : 'primary'}>{importing ? 'See import progress' : 'Go to connections'}</ButtonLink>}
        />
        <ChannelFreshness connections={connected} />
      </>
    );
  }

  const s = summary.data;
  const cur = s.dataPeriod.current;
  const prev = s.dataPeriod.previous;
  const comparable = s.periodComparison.comparable;
  const best = s.topContent[0];
  const toLook = s.needsImprovement[0];
  const attention = connected.find((c) => c.status === 'connection_expired' || c.status === 'permission_required');

  return (
    <>
      <PageHeader title={name ? `Hi, ${name}` : 'Hi'} description={overview.data.hero.heading} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Posts in the last 30 days"
          value={formatNumber(cur.count)}
          meaning={prev.count > 0 ? `${formatNumber(prev.count)} in the 30 days before.` : 'Nothing posted in the 30 days before.'}
        />
        <StatCard
          label="Typical views per post"
          value={cur.count ? formatCompact(cur.medianViews) : '—'}
          change={comparable ? s.periodComparison.viewsMedianChangePct : null}
          meaning={cur.count ? 'Half your recent posts got more than this, half got fewer.' : 'No posts in this period yet.'}
        />
        <StatCard
          label="Typical engagement"
          value={cur.count ? formatPercent(cur.medianEngagementRate) : '—'}
          change={comparable ? s.periodComparison.engagementRateMedianChangePct : null}
          meaning={cur.count ? 'Likes and comments compared with how many people saw the post.' : 'No posts in this period yet.'}
        />
      </div>
      <div className="mt-2">
        <HelpPopover>
          <p>&ldquo;Typical&rdquo; is the median: the middle value when your posts are lined up from lowest to highest. One viral post can&apos;t skew it the way an average can.</p>
          <p>Changes compare the last {s.dataPeriod.days} days with the {s.dataPeriod.days} days before. We only show a change when both periods have at least 3 posts.</p>
        </HelpPopover>
      </div>

      {overview.data.signals.length ? (
        <section className="mt-8" aria-labelledby="signals">
          <h2 id="signals" className="mb-3 text-lg font-semibold">What to know right now</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {overview.data.signals.slice(0, 3).map((sig) => <SignalCard key={sig.id} signal={sig} />)}
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <PostHighlight
          title="Your standout post"
          empty={s.insufficientHistory.length === s.platformsIncluded.length ? 'We need at least 5 posts on a channel before we can tell what stands out.' : 'No post is clearly above your usual yet. Keep posting and check back.'}
          item={best}
          onOpen={setOpenPost}
        />
        <PostHighlight
          title="A post to look at"
          empty="Nothing is clearly below your usual. Nice."
          item={toLook}
          onOpen={setOpenPost}
        />
      </div>

      <Card className="mt-8 flex flex-wrap items-center justify-between gap-4 bg-tint">
        <div>
          <h2 className="text-lg font-semibold">Your next step</h2>
          <p className="text-ink-muted">
            {attention ? `${attention.name} needs your attention so we can keep your results up to date.` : 'Turn what worked into your next post.'}
          </p>
        </div>
        {attention ? (
          <ButtonLink href={`/connections#${attention.platform}`} icon={<ArrowRight className="size-4" aria-hidden />}>Fix {attention.name}</ButtonLink>
        ) : (
          <ButtonLink href="/plan" icon={<ArrowRight className="size-4" aria-hidden />}>Plan your next post</ButtonLink>
        )}
      </Card>

      <ChannelFreshness connections={connected} />
      <PostDrawer mediaId={openPost} onClose={() => setOpenPost(null)} />
    </>
  );
}

function SignalCard({ signal }: { signal: KeySignal }) {
  const link = SIGNAL_LINK[signal.actionTarget];
  const Icon = SIGNAL_ICON[signal.category] ?? Lightbulb;
  return (
    <Card className="flex flex-col">
      <p className="flex items-center gap-2 text-sm font-semibold text-action">
        <Icon className="size-4" aria-hidden /> {signal.category}
      </p>
      <h3 className="mt-2 font-semibold">{signal.title}</h3>
      <p className="mt-1 flex-1 text-[15px] text-ink-muted">{signal.description}</p>
      {link ? (
        <Link href={link.href} className="mt-3 inline-flex min-h-11 items-center gap-1 font-semibold text-action hover:underline">
          {link.label} <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </Card>
  );
}

function PostHighlight({ title, item, empty, onOpen }: { title: string; item?: RankedItem; empty: string; onOpen: (id: string) => void }) {
  const tz = useMe().data?.profile?.timezone;
  return (
    <Card>
      <CardHeader title={title} as="h2" />
      {item ? (
        <button type="button" onClick={() => onOpen(item.id)} className="block w-full rounded-xl text-left hover:bg-surface-2">
          <div className="flex flex-wrap items-center gap-2">
            <PlatformIcon platform={item.platform} className="size-5" />
            <span className="text-sm font-semibold text-ink-muted">{formatLabel(item.contentType)} · {formatDate(item.publishedAt, tz)}</span>
            <Badge tone={CLASSIFICATION[item.classification].tone}>{CLASSIFICATION[item.classification].label}</Badge>
          </div>
          <p className="mt-2 line-clamp-2 font-semibold">{item.title || 'Untitled post'}</p>
          <p className="mt-1 text-[15px] text-ink-muted">
            {formatPercent(item.engagementRate)} engagement
            {item.vsMedianEngagementPct !== null ? ` (${formatChange(item.vsMedianEngagementPct)} vs your typical ${PLATFORM_LABEL[item.platform]} post)` : ''}
          </p>
          <span className="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-action">Open details <ArrowRight className="size-4" aria-hidden /></span>
        </button>
      ) : (
        <p className="text-ink-muted">{empty}</p>
      )}
    </Card>
  );
}

function ChannelFreshness({ connections }: { connections: Connection[] }) {
  return (
    <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted" aria-label="When each channel was last updated">
      {connections.map((c) => (
        <li key={c.platform} className="flex items-center gap-2">
          <PlatformIcon platform={c.platform} decorative className="size-4" />
          {c.name}: {timeAgo(c.sync.lastSyncedAt) ? `Updated ${timeAgo(c.sync.lastSyncedAt)}` : 'Not updated yet'}
        </li>
      ))}
    </ul>
  );
}
