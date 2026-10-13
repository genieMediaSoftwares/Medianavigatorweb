import type { VideoObservation } from '@/types/api';
const timestamp = (n: number) => `${Math.floor(n / 60)}:${Math.floor(n % 60).toString().padStart(2, '0')}`;
export function VideoEvidence({ observations }: { observations: VideoObservation[] }) {
  if (!observations.length) return null;
  return <section className="space-y-3" aria-label="Video evidence">
    <h3 className="text-lg">What happens in the video</h3>
    {observations.map((point, i) => <article key={i} className="rounded-xl border border-line bg-surface p-4 space-y-2">
      <p className="text-sm font-bold text-brand-700">{timestamp(point.startSeconds)}–{timestamp(point.endSeconds)}</p>
      <p className="text-sm text-ink"><strong>Observed: </strong>{point.observation}</p>
      <p className="text-sm text-muted"><strong>Possible performance factor: </strong>{point.performanceHypothesis}</p>
      <p className="text-sm text-muted"><strong>Edit to test: </strong>{point.recommendation}</p>
    </article>)}
  </section>;
}
