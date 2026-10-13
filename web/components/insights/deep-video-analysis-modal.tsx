'use client';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ErrorState, Notice } from '@/components/ui/states';
import { api } from '@/lib/api/endpoints';
import type { Performer } from '@/types/api';
import { VideoEvidence } from './video-evidence';
export function DeepVideoAnalysisModal({ open, onOpenChange, item }: { open: boolean; onOpenChange: (open: boolean) => void; item: Performer | null }) {
  const query = useQuery({ queryKey: ['video-content-evidence-v1', item?.mediaId], queryFn: () => api.analyzeVideo(item!.mediaId), enabled: Boolean(open && item), staleTime: 60_000, retry: false });
  const data = query.data;
  const analyzed = data?.ai && ['ran', 'cached'].includes(data.ai.status);
  return <Modal open={open} onOpenChange={onOpenChange} title="Video content analysis" description="Scene and audio observations, timestamps, and specific edits to test." className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scroll">
    <div className="space-y-5">
      <h3 className="text-base">{item?.title || item?.caption}</h3>
      {query.isFetching && <Notice>Sending the video to Gemini and reviewing its content. This can take a few minutes.</Notice>}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {!query.isFetching && data && <>
        {!analyzed ? <Notice tone="warn">{data.ai?.reason || 'Video analysis could not be completed.'}<Button variant="secondary" onClick={() => void query.refetch()}>Retry</Button></Notice> : <>
          <p className="text-xs text-muted">Gemini video analysis · {data.ai?.model} · {data.ai?.status === 'cached' ? 'Saved analysis' : 'New analysis'}</p>
          <VideoEvidence observations={data.observations ?? []} />
          {[['Opening', data.hookAssessment], ['Audio and pacing', data.audioPacingFeedback], ['Sound-off viewing', data.soundOffOptimizationTip], ['Caption', data.captionAssessment]].map(([label, text]) => text && <section key={label} className="rounded-xl border border-line p-4"><h3 className="text-base">{label}</h3><p className="mt-2 text-sm text-muted">{text}</p></section>)}
          {data.testedAlternativeHook && <section><h3 className="text-base">Alternative hook to test</h3><p className="mt-2 text-sm">{data.testedAlternativeHook}</p></section>}
          <ul className="list-disc pl-5 space-y-2 text-sm">{data.recommendations?.map((text, i) => <li key={i}>{text}</li>)}</ul>
        </>}
        <ul className="space-y-1 text-xs text-muted">{data.limitations?.map((text, i) => <li key={i}>{text}</li>)}</ul>
      </>}
    </div>
  </Modal>;
}
