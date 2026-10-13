import type { VideoReport } from '@/types/api';
import { VideoEvidence } from './video-evidence';

const SPEECH: Record<VideoReport['audio']['speech'], string> = { none: 'No speech', voiceover: 'Voice-over', on_camera: 'On camera', mixed: 'Voice-over and on camera' };

function Module({ title, rows, children }: { title: string; rows?: Array<[string, string | undefined]>; children?: React.ReactNode }) {
  const shown = (rows ?? []).filter(([, value]) => value);
  if (!shown.length && !children) return null;
  return <section className="rounded-xl border border-line p-4 space-y-2">
    <h3 className="text-base">{title}</h3>
    {shown.map(([label, value]) => <p key={label} className="text-sm text-muted"><strong className="text-ink">{label}: </strong>{value}</p>)}
    {children}
  </section>;
}

/** Renders the seven analysis modules of a Reel report. */
export function VideoReportView({ report }: { report: VideoReport }) {
  const { hook, visual, audio, storytelling: story, marketing, contentStrategy: strategy } = report;
  return <div className="space-y-4">
    {report.summary && <p className="text-sm">{report.summary}</p>}
    <Module title={`1. Hook analysis · ${hook.strength} strength`} rows={[['First 1–3 seconds', hook.firstSeconds], ['Attention grabber', hook.attentionGrabber], ['Curiosity', hook.curiosityTrigger], ['Assessment', hook.assessment]]} />
    <Module title="2. Visual analysis" rows={[['Transitions and editing', visual.transitionsAndEditing]]}>
      {visual.textOverlays.length > 0 && <ul className="list-disc pl-5 text-sm text-muted">{visual.textOverlays.map((o, i) => <li key={i}><strong className="text-ink">{o.timestamp}</strong> “{o.text}”</li>)}</ul>}
    </Module>
    <VideoEvidence observations={visual.scenes.map((s) => ({ startSeconds: s.startSeconds, endSeconds: s.endSeconds, observation: [s.description, s.framing && `(${s.framing})`].filter(Boolean).join(' '), performanceHypothesis: s.whyItMayMatter, recommendation: s.editToTest }))} />
    <Module title="3. Audio analysis" rows={[['Speech', SPEECH[audio.speech]], ['Music', audio.music], ['Tone', audio.tone], ['Works with sound off', audio.soundOffReadable]]}>
      {audio.transcript && <details className="text-sm text-muted"><summary className="cursor-pointer text-ink">Transcript</summary><p className="mt-2 whitespace-pre-wrap">{audio.transcript}</p></details>}
    </Module>
    <Module title="4. Storytelling" rows={[['Problem', story.problem], ['Emotion', story.emotion], ['Narrative', story.narrative], ['Payoff', story.payoff]]} />
    <Module title="5. Marketing analysis" rows={[['Call to action', marketing.cta], ['Product placement', marketing.productPlacement], ['Audience intent', marketing.audienceIntent]]} />
    <Module title="6. Content strategy" rows={[['Topic', strategy.topic], ['Niche', strategy.niche], ['Format', strategy.format], ['Content pillar', strategy.contentPillar]]} />
    <Module title="Performance correlations (possible, not proven)">
      {report.performanceCorrelations.length > 0 && <ul className="space-y-2 text-sm text-muted">{report.performanceCorrelations.map((c, i) => <li key={i}>{c.observation}{c.relatedMetric && <> — <strong className="text-ink">{c.relatedMetric}</strong></>}{c.caveat && <span className="block text-xs">{c.caveat}</span>}</li>)}</ul>}
    </Module>
    <Module title="7. Improvements to test in your next Reel">
      <ol className="list-decimal pl-5 space-y-2 text-sm">{report.improvements.map((item, i) => <li key={i}><strong>{item.change}</strong>{item.rationale && <span className="text-muted"> — {item.rationale}</span>}{item.metricToWatch && <span className="block text-xs text-muted">Watch: {item.metricToWatch}</span>}</li>)}</ol>
      {report.alternativeHook && <p className="text-sm"><strong>Alternative hook to test: </strong>{report.alternativeHook}</p>}
    </Module>
    {report.captionAssessment && <Module title="Caption" rows={[['Assessment', report.captionAssessment]]} />}
  </div>;
}
