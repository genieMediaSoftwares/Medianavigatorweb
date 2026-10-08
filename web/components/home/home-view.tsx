'use client';

import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { PostDetailDrawer } from '@/components/posts/post-detail-drawer';
import { LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, Notice } from '@/components/ui/states';
import { platformName } from '@/lib/platforms';
import { useChannel } from '@/lib/hooks/useChannel';
import { useConnections, useOverview, useSummary } from '@/lib/hooks/useQueries';
import { useSync } from '@/lib/hooks/useSync';
import { FeaturedPost, ImportingState, SignalList, StatRow, UpdatedLine, WelcomeState } from './home-parts';
import type { Summary } from '@/types/api';

function relative(pct: number | null, word: string): string {
  if (pct === null) return '';
  const r = Math.round(Math.abs(pct));
  return r < 1 ? `About the same ${word} as your usual.` : `${r}% ${pct > 0 ? 'more' : 'less'} ${word} than your usual.`;
}

function headline(summary: Summary, channelLabel: string): string {
  const n = summary.dataPeriod.current.count;
  if (n === 0) return `You haven't published anything ${channelLabel} in the last 30 days.`;
  const m = summary.platformsIncluded.length;
  return `We looked at ${n} ${n === 1 ? 'post' : 'posts'} ${channelLabel === 'across all channels' ? `across ${m} ${m === 1 ? 'channel' : 'channels'}` : channelLabel} from the last 30 days.`;
}

export function HomeView() {
  const { channel } = useChannel();
  const sync = useSync();
  const connections = useConnections({ refetchInterval: (q) => ((q.state.data ?? []).some((c) => c.connected && c.dataPointsCount === 0) ? 5000 : false) });
  const connected = (connections.data ?? []).filter((c) => c.connected);
  const visible = channel === 'all' ? connected : connected.filter((c) => c.platform === channel);
  const hasPosts = connected.some((c) => c.dataPointsCount > 0);
  const summary = useSummary(channel, 30);
  const overview = useOverview();
  const [open, setOpen] = useState<string | null>(null);
  const syncing = sync.active.length > 0;

  let body;
  if (connections.isLoading) body = <PageSkeleton />;
  else if (connections.isError) body = <ErrorState error={connections.error} onRetry={() => void connections.refetch()} />;
  else if (connected.length === 0) body = <WelcomeState />;
  else if (!hasPosts) body = <ImportingState connections={connected} runs={sync.runs} syncing={syncing || connected.some((c) => c.status === 'syncing' || c.status === 'connecting')} onSync={() => void sync.start('all')} />;
  else if (summary.isLoading) body = <PageSkeleton />;
  else if (summary.isError) body = <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />;
  else if (summary.data) {
    const s = summary.data;
    const label = channel === 'all' ? 'across all channels' : `on ${platformName(channel)}`;
    const hero = channel === 'all' && overview.data?.hero.heading ? overview.data.hero : null;
    const top = s.topContent[0];
    const low = s.needsImprovement[0];
    const signals = overview.data?.signals ?? [];
    const hasTiming = signals.some((x) => x.actionTarget === 'timing');
    const next = s.dataPeriod.current.count === 0 || !hasTiming
      ? { href: '/plan', label: 'Plan your next post', why: s.dataPeriod.current.count === 0 ? "You haven't posted lately, so a plan can help you get going." : 'Pick a day and a channel for your next post.' }
      : { href: '/best-times', label: 'See your best times to post', why: 'We found a time when your posts do best.' };
    body = (
      <div className="space-y-8">
        <Card>
          <h2 className="text-2xl">{hero ? hero.heading : headline(s, label)}</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">{hero ? hero.summary : s.dataPeriod.current.count > 0 ? 'Here is how the last 30 days went.' : 'Share a new post and it will show up here after the next update.'}</p>
          <div className="mt-5 border-t border-line pt-4"><UpdatedLine connections={visible} syncing={syncing} /></div>
        </Card>

        {s.dataPeriod.current.count === 0 && <Notice tone="info">There are no posts from the last 30 days, so the numbers below are empty. Your older posts are still on the Posts page.</Notice>}
        <StatRow summary={s} />

        {overview.isError ? <Notice tone="warn">We couldn&apos;t load your signals right now. <button className="font-semibold underline" onClick={() => void overview.refetch()}>Try again</button></Notice>
          : <SignalList signals={signals} scopeNote={channel === 'all' ? undefined : 'Signals look at all your channels together.'} />}

        <div className="grid gap-8 md:grid-cols-2">
          <FeaturedPost title="Your best post this month" post={top} summary={s} onOpen={setOpen} tagOverride="doing-well"
            line={top ? <>{relative(top.vsMedianEngagementPct, 'engagement') || 'This is your strongest post lately.'} Well done.</> : null}
            empty="We need a few more posts in the last 30 days before we can pick a best one." />
          <FeaturedPost title="A post to look at" post={low} summary={s} onOpen={setOpen} tagOverride="could-be-better"
            line={low ? <>{relative(low.vsMedianEngagementPct, 'engagement') || 'This one is worth a second look.'} Open it for ideas to try next time.</> : null}
            empty="Nothing stands out as needing attention. That is a good sign." />
        </div>

        <Card className="flex flex-wrap items-center justify-between gap-4 bg-brand-50 border-brand-100">
          <div className="min-w-0">
            <p className="eyebrow">Next best action</p>
            <p className="mt-1 text-[15px] text-ink">{next.why}</p>
          </div>
          <LinkButton href={next.href} size="lg">{next.label}<ArrowRight className="h-5 w-5" aria-hidden="true" /></LinkButton>
        </Card>
      </div>
    );
  } else body = <EmptyState title="Nothing to show yet" />;

  return (
    <>
      <PageHeader title="Home" subtitle="A quick look at how your posts are doing and what to do next." />
      {body}
      <PostDetailDrawer postId={open} onClose={() => setOpen(null)} />
    </>
  );
}
