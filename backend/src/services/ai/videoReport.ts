import { z } from 'zod';

/**
 * Media Navigator's structured Reel report: one module per question a social analyst asks.
 * Long fields are trimmed rather than rejected so a slightly verbose answer is still usable.
 */
const text = (max: number) => z.string().transform((v) => v.trim().slice(0, max)).default('');
const list = <T extends z.ZodTypeAny>(item: T, max: number) => z.array(item).transform((a) => a.slice(0, max)).default([]);
const level = z.string().transform((v) => v.toLowerCase()).pipe(z.enum(['high', 'medium', 'low'])).catch('medium');
const seconds = z.number().min(0).catch(0);

const scene = z.object({
  startSeconds: seconds, endSeconds: seconds,
  description: text(500),
  framing: text(300),
  whyItMayMatter: text(500),
  editToTest: text(500),
});

export const videoReportSchema = z.object({
  summary: text(1200),
  interpretation: text(1500).default(''),
  hook: z.object({
    firstSeconds: text(600),
    attentionGrabber: text(500),
    curiosityTrigger: text(500),
    strength: level,
    assessment: text(1000),
  }),
  visual: z.object({
    scenes: list(scene, 12).refine((a) => a.length >= 1, 'At least one scene is required'),
    transitionsAndEditing: text(800),
    textOverlays: list(z.object({ timestamp: text(20), text: text(300) }), 12),
  }),
  audio: z.object({
    speech: z.enum(['none', 'voiceover', 'on_camera', 'mixed']).catch('none'),
    transcript: text(4000),
    music: text(500),
    tone: text(500),
    soundOffReadable: text(600),
  }),
  storytelling: z.object({ problem: text(500), emotion: text(500), narrative: text(800), payoff: text(500) }),
  marketing: z.object({ cta: text(500), productPlacement: text(500), audienceIntent: text(500) }),
  contentStrategy: z.object({ topic: text(300), niche: text(300), format: text(300), contentPillar: text(300) }),
  performanceCorrelations: list(z.object({ observation: text(500), relatedMetric: text(300), caveat: text(400) }), 5),
  improvements: list(z.object({ change: text(500), rationale: text(500), metricToWatch: text(200) }), 6).refine((a) => a.length >= 1, 'At least one improvement is required'),
  whatWorked: list(text(400), 5),
  whatToImprove: list(text(400), 5),
  alternativeHook: text(400),
  captionAssessment: text(1000),
});

export type VideoReport = z.infer<typeof videoReportSchema>;

/** The report plus the flat fields older clients (post drawer, diagnose-post) already read. */
export function withLegacyFields(r: VideoReport) {
  const s = r.storytelling;
  const bullet = (label: string, ...parts: string[]) => `${label}: ${parts.filter(Boolean).join(' ')}`.slice(0, 700);
  return {
    ...r,
    interpretation: r.interpretation || r.summary,
    hookAssessment: r.hook.assessment,
    audioPacingFeedback: [r.audio.tone, r.audio.music].filter(Boolean).join(' '),
    soundOffOptimizationTip: r.audio.soundOffReadable,
    recommendations: r.improvements.map((i) => i.change),
    observations: r.visual.scenes.map((sc) => ({
      startSeconds: sc.startSeconds,
      endSeconds: Math.max(sc.endSeconds, sc.startSeconds),
      observation: sc.description,
      performanceHypothesis: sc.whyItMayMatter,
      recommendation: sc.editToTest,
    })),
    sixBulletAnalysis: [
      bullet('Hook', r.hook.firstSeconds, r.hook.assessment),
      bullet('Visuals', r.visual.transitionsAndEditing, r.visual.scenes[0]?.description ?? ''),
      bullet('Audio', r.audio.tone, r.audio.music),
      bullet('Story', s.problem, s.narrative, s.payoff),
      bullet('Marketing', r.marketing.cta, r.marketing.audienceIntent),
      bullet('Strategy', r.contentStrategy.topic, r.contentStrategy.contentPillar),
    ],
  };
}
