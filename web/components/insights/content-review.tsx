'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/api/client';
import { useMe } from '@/lib/hooks/useQueries';
import { qk } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { ErrorState, Notice } from '@/components/ui/states';
interface Review {
  model: string | null; fromCache: boolean; stale: boolean; refreshError?: string;
  result: {
    summary: string; limitations: string[]; recommendations: string[];
    evidence: { visual: string; coversTimeline: boolean; momentsCited: number };
    points: { number: number; title: string; observations: string[]; interpretation: string; confidence: string; evidence: { source: string; timestamp?: string | null; description: string }[] }[];
  };
}
export function ContentReview({ mediaId, type, isVideo }: { mediaId: string; isVideo: boolean; type: 'deep' | 'why_top' | 'why_bottom' }) {
  const qc = useQueryClient();
  const me = useMe();
  const free = type === 'why_top' ? me.data?.user.freeTopChecksRemaining : type === 'why_bottom' ? me.data?.user.freeBottomChecksRemaining : 0;
  const cost = isVideo ? 20 : 5;
  const query = useMutation({ mutationFn: () => apiSend<Review>('POST', '/intelligence/content-analysis', { mediaId, type }), onSettled: () => qc.invalidateQueries({ queryKey: qk.me }) });
  const data = query.data;
  return <div className="space-y-5">
    {!data && !query.isPending && <Notice>Review the actual images or video alongside the post’s metrics. {free ? 'Uses one free review if a new analysis is needed.' : `A new analysis costs ${cost} Insight Credits. Saved current results are free.`} <Button className="mt-3" onClick={() => query.mutate()}>Analyze this content</Button></Notice>}
    {query.isPending && <Notice>Reviewing the media, audio and performance evidence. Video analysis can take a few minutes.</Notice>}
    {query.isError && <ErrorState error={query.error} onRetry={() => query.mutate()} />}
    {data && <>
      <p className="text-xs text-muted">{data.model} · {data.fromCache ? 'Saved analysis' : 'New analysis'} · {data.result.evidence.momentsCited} timestamped moments</p>
      {(data.stale || data.refreshError) && <Notice tone="warn">{data.refreshError || 'This saved analysis may be out of date.'}</Notice>}
      <p>{data.result.summary}</p>
      <ol className="space-y-4">{data.result.points.map(p => <li key={p.number} className="rounded-xl border border-line p-4 space-y-2">
        <h3 className="text-base">{p.number}. {p.title}</h3>
        {p.observations.map((text, i) => <p className="text-sm" key={i}>{text}</p>)}
        <ul className="space-y-1 text-sm text-muted">{p.evidence.map((e, i) => <li key={i}><strong>{e.timestamp || e.source.replaceAll('_', ' ')}:</strong> {e.description}</li>)}</ul>
        <p className="text-sm">{p.interpretation}</p>
        <p className="text-xs text-muted">Confidence: {p.confidence}</p>
      </li>)}</ol>
      {data.result.recommendations.length > 0 && <div><h3 className="text-base">What to test next</h3><ul className="list-disc pl-5 text-sm">{data.result.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
      {data.result.limitations.map((l, i) => <Notice key={i} tone="warn">{l}</Notice>)}
      <p className="text-xs text-muted">Observed content and metrics support possible explanations, not proven causes of reach or engagement.</p>
    </>}
  </div>;
}
