'use client';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ErrorState, Notice } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api/endpoints';
import { compact, percent } from '@/lib/format';
import type { Performer } from '@/types/api';
import { VideoEvidence } from './video-evidence';

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void; item: Performer | null; type: 'top' | 'bottom';
  onOpenFullDetail?: (mediaId: string) => void; onOpenVideoAnalysis?: (item: Performer) => void;
}
export function WhyPerformerModal({ open, onOpenChange, item, type, onOpenFullDetail }: Props) {
  const query = useQuery({ queryKey: ['diagnose-video-evidence-v1', item?.mediaId], queryFn: () => api.diagnosePost(item!.mediaId), enabled: Boolean(open && item), staleTime: 60_000, retry: false });
  if (!item) return null;
  const data = query.data;
  const video = ['reel', 'short', 'video'].includes(item.contentType);
  const analyzed = data && ['ran', 'cached'].includes(data.ai.status);
  return <Modal open={open} onOpenChange={onOpenChange} title={type === 'top' ? 'Why this post ranks near the top' : 'Why this post ranks near the bottom'} description={video ? 'Video evidence alongside your measured performance.' : 'Caption and performance analysis.'} className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scroll">
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-app p-4"><h3 className="text-base">{item.title || item.caption || 'Untitled post'}</h3><p className="mt-2 text-sm text-muted">{compact(item.views)} views · {percent(item.engagementRate)} engagement · {item.baselineComparison}</p></div>
      {query.isFetching && <div className="space-y-3"><Notice>{video ? 'Gemini is processing the video and reviewing its content. This can take a few minutes.' : 'Analyzing caption and measured performance…'}</Notice><Skeleton className="h-24" /></div>}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {!query.isFetching && data && <>
        {!analyzed ? <Notice tone="warn">{data.ai.reason || 'Analysis is unavailable.'} No completed content analysis is available. <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>Retry analysis</Button></Notice> : <>
          <p className="text-xs text-muted">{data.source} · {data.ai.model} · {data.ai.status === 'cached' ? 'Saved analysis' : 'New analysis'}</p>
          <p className="text-sm text-ink">{data.executiveSummary}</p>
          <ol className="space-y-3 list-decimal pl-5">{data.sixBulletAnalysis?.map((point, i) => <li key={i} className="text-sm text-ink pl-1">{point}</li>)}</ol>
          <VideoEvidence observations={data.videoEvidence?.observations ?? []} />
          {data.suggestedHookAlternative && <div className="rounded-xl bg-brand-50 p-4"><h3 className="text-base">Alternative hook to test</h3><p className="mt-2 text-sm">{data.suggestedHookAlternative}</p></div>}
        </>}
        <p className="text-sm text-muted">{data.baselineComparison}. Engagement classification is separate from the list’s view ranking.</p>
        <ul className="space-y-1 text-xs text-muted">{data.limitations.map((line, i) => <li key={i}>{line}</li>)}</ul>
      </>}
      {onOpenFullDetail && <Button variant="secondary" onClick={() => { onOpenChange(false); onOpenFullDetail(item.mediaId); }}>Open post details</Button>}
    </div>
  </Modal>;
}
