'use client';

import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Eye, Heart, MessageCircle, Share2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { PostDetailDrawer } from '@/components/posts/post-detail-drawer';
import { PostThumb } from '@/components/posts/post-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Notice } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformIcon } from '@/components/ui/platform-logo';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { compact, dateShort, percent } from '@/lib/format';
import { useChannel } from '@/lib/hooks/useChannel';
import { useMediaItem } from '@/lib/hooks/usePosts';
import { useSummary } from '@/lib/hooks/useQueries';
import { typeLabel } from '@/lib/platforms';
import type { DiagnosePostResult, SlimPost } from '@/types/api';
import { Bullets } from './ai-report';

function Tile({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) {
  return <div className="rounded-xl bg-brand-50 px-3 py-2.5"><p className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</p><p className="mt-0.5 font-display text-lg font-bold text-ink tabular">{value}</p></div>;
}

function RankedCard({ post, rank, mode, onOpen }: { post: SlimPost; rank: number; mode: 'top' | 'low'; onOpen: (id: string) => void }) {
  const item = useMediaItem(post.id);
  const why = useMutation<DiagnosePostResult, ApiError>({ mutationFn: () => api.diagnosePost(post.id) });
  const d = why.data;
  const aiOk = d ? d.ai.status === 'ran' || d.ai.status === 'cached' : false;
  const vs = post.vsMedianEngagementPct;
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
        <div className="relative">
          {item.data ? <PostThumb item={item.data} uniform className="sm:h-full sm:aspect-auto" /> : <Skeleton className="aspect-[4/5] sm:h-full" />}
          <span className={`absolute left-3 top-3 flex h-9 min-w-9 items-center justify-center rounded-xl px-2 font-display text-base font-bold text-white shadow ${mode === 'top' ? 'bg-brand-600' : 'bg-ink'}`}>#{rank}</span>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2"><PlatformIcon platform={post.platform} className="h-5 w-5" /><Badge tone="brand">{typeLabel(post.contentType, 'provider')}</Badge><span className="text-sm text-subtle">{dateShort(post.publishedAt)}</span></div>
            <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug text-ink">{post.title || 'Untitled post'}</h3>
            {vs !== null && <p className={`mt-1 text-sm font-semibold ${vs >= 0 ? 'text-good' : 'text-warn'}`}>{vs >= 0 ? '+' : ''}{Math.round(vs)}% engagement compared with your usual</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Tile icon={Eye} label="Views" value={compact(post.views)} />
            <Tile icon={Heart} label="Likes" value={compact(post.likes)} />
            <Tile icon={MessageCircle} label="Comments" value={compact(post.comments)} />
            <Tile icon={Share2} label="Shares" value={compact(post.shares)} />
            <Tile icon={Sparkles} label="Engagement" value={percent(post.engagementRate)} />
          </div>
          {why.isError && <Notice tone="bad">{why.error.status === 429 ? 'Too many requests. Please try again in a moment.' : why.error.message}</Notice>}
          {d && (
            <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-4" aria-live="polite">
              <Badge tone={aiOk ? 'brand' : 'neutral'}><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{aiOk ? 'Explained with AI' : 'Numbers only (AI not available)'}</Badge>
              <p className="text-[15px] text-text">{d.executiveSummary}</p>
              {(mode === 'top' ? d.topSuccessDrivers : d.bottomImprovementPoints).length > 0 && <div><p className="mb-1.5 text-sm font-bold text-ink">{mode === 'top' ? 'What may have helped' : 'What to improve'}</p><Bullets items={mode === 'top' ? d.topSuccessDrivers : d.bottomImprovementPoints} /></div>}
              {d.suggestedHookAlternative && <p className="rounded-lg bg-brand-50 p-3 text-sm text-ink"><span className="font-semibold">Try this opening: </span>{d.suggestedHookAlternative}</p>}
            </div>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            {!d && <Button variant="secondary" size="md" loading={why.isPending} onClick={() => why.mutate()}>{mode === 'top' ? 'Why it did well' : 'What to improve'}</Button>}
            <Button variant="ghost" size="md" onClick={() => onOpen(post.id)}>Full analysis <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function RankedPosts({ mode }: { mode: 'top' | 'low' }) {
  const { channel, days } = useChannel();
  const s = useSummary(channel, days);
  const [open, setOpen] = useState<string | null>(null);
  if (s.isPending) return <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>;
  if (s.isError) return <ErrorState error={s.error} onRetry={() => s.refetch()} />;
  const list = mode === 'top' ? s.data.topContent : s.data.needsImprovement;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{mode === 'top' ? 'Posts that did better than your own usual results' : 'Posts that did worse than your own usual results'} in the last {days} days. Compared only with your own history.</p>
      {list.length === 0
        ? <EmptyState title={mode === 'top' ? 'No standout posts yet' : 'Nothing needs attention'} description={s.data.insufficientHistory.length ? 'We need at least 5 posts on a channel before we can tell what is above or below your usual.' : `No posts in the last ${days} days were clearly ${mode === 'top' ? 'above' : 'below'} your usual.`} />
        : list.map((p, i) => <RankedCard key={p.id} post={p} rank={i + 1} mode={mode} onOpen={setOpen} />)}
      <PostDetailDrawer postId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
