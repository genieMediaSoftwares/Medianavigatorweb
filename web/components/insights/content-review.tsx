'use client';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
  const [showBetter, setShowBetter] = useState(false);
  const data = query.data;
  return <div className="space-y-5">
    {!data && !query.isPending && <section className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50 to-white">
      <div className="space-y-4 p-6">
        <span className="inline-flex rounded-xl bg-white p-3 text-brand-600"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
        <div><h3 className="text-lg">Understand this content</h3><p className="mt-2 text-sm leading-relaxed text-muted">A focused review of the creative choices behind this post, supported by available media and performance. If the full video is unavailable, we automatically provide a clearly labelled limited review.</p></div>
        <ul className="space-y-2 text-sm text-muted">{['Opening, visuals and storytelling', 'Evidence behind the performance', 'Specific improvements to test'].map(t => <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />{t}</li>)}</ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-brand-100 bg-white/70 p-5">
        <p className="max-w-xs text-xs leading-relaxed text-muted">{free ? 'One free review. Current saved results are free.' : `${cost} Insight Credits for a new review. Current saved results are free.`}</p>
        <Button onClick={() => query.mutate()}>Start analysis <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
      </div>
    </section>}

    {query.isPending && <Notice><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand-500 border-r-transparent mr-2" aria-hidden="true" />Analysing content, frames, audio, and measured performance. This can take a few minutes.</Notice>}
    {query.isError && <ErrorState error={query.error} onRetry={() => query.mutate()} />}
    {data && <>
      <p className="text-xs text-muted">Media Navigator analysis · {data.fromCache ? 'Saved analysis' : 'New analysis'} · {data.result.evidence.momentsCited} timestamped moments</p>
      {(data.stale || data.refreshError) && <Notice tone="warn">{data.refreshError || 'This saved analysis may be out of date.'}</Notice>}
      <p>{data.result.summary}</p>
      <ol className="space-y-4">{data.result.points.map(p => <li key={p.number} className="rounded-xl border border-line p-4 space-y-2">
        <h3 className="text-base">{p.number}. {p.title}</h3>
        {p.observations.map((text, i) => <p className="text-sm" key={i}>{text}</p>)}
        <details className="rounded-lg bg-brand-50/50 p-3"><summary className="cursor-pointer text-xs font-medium text-brand-700">View supporting evidence</summary><ul className="mt-3 space-y-2 text-sm text-muted">{p.evidence.map((e, i) => <li key={i}><strong>{e.timestamp || e.source.replaceAll('_', ' ')}:</strong> {e.description}</li>)}</ul></details>
        <p className="text-sm">{p.interpretation}</p>
        <p className="text-xs text-muted">Confidence: {p.confidence}</p>
      </li>)}</ol>
      {data.result.recommendations.length > 0 && <div><h3 className="text-base">What to test next</h3><ul className="list-disc pl-5 text-sm">{data.result.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
      <div className="space-y-3">
        <Button variant="primary" onClick={() => setShowBetter((v) => !v)}>Make it better</Button>
        {showBetter && <div className="rounded-xl bg-brand-50 p-4 space-y-2">
          <p className="text-sm font-semibold">3 scripts to test</p>
          <ol className="list-decimal pl-5 space-y-2 text-sm">{(data.result.recommendations.slice(0, 3) || []).map((script, i) => <li key={i}>{script}</li>)}</ol>
        </div>}
      </div>
      <p className="text-xs text-muted">Media Navigator analysis is based on observed content and measured evidence, not guaranteed reach.</p>
    </>}
  </div>;
}
