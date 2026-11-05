import { z } from 'zod';
import { DEEP_CATEGORIES, type DeepSource, type PriorityFinding, type DeepAction } from '../../../../shared/deepAnalysisV2.js';

export const shortText = z.string().trim().min(1).max(700);
export const confidenceSchema = z.enum(['high', 'medium', 'low']);
export const statusSchema = z.enum(['strong', 'good', 'needs_attention', 'insufficient_evidence']);
export const observationSchema = z.object({
  observations: z.array(z.object({ source: z.enum(['video_frame', 'audio', 'image', 'document', 'on_screen_text', 'caption', 'title']), startSeconds: z.number().finite().nonnegative().nullable(), endSeconds: z.number().finite().nonnegative().nullable(), pageNumber: z.number().int().positive().nullable(), quote: z.string().max(1200).nullable(), description: shortText, confidence: confidenceSchema })).max(40),
  segments: z.array(z.object({ startSeconds: z.number().finite().nonnegative().nullable(), endSeconds: z.number().finite().nonnegative().nullable(), status: z.enum(['strong', 'good', 'review', 'needs_attention', 'insufficient_evidence']), observationIndexes: z.array(z.number().int().nonnegative()).max(12) })).max(30),
  processed: z.boolean(), audioStatus: z.enum(['speech', 'music', 'speech_and_music', 'silent', 'unavailable', 'not_applicable']), limitations: z.array(shortText).max(10),
});
// Bound model prose to the same limits as persisted reports. Never manufacture citations.
const modelText = (max = 700) => z.string().trim().min(1).max(6000).transform((value) => value.slice(0, max));
export const candidateSchema = z.object({
  summary: modelText(), strongestQuality: modelText().nullable(), mainOpportunity: modelText().nullable(), keyTakeaway: modelText(),
  findings: z.array(z.object({ category: z.enum(DEEP_CATEGORIES), title: modelText(100), status: statusSchema, explanation: modelText(200), finding: modelText(), evidenceIds: z.array(z.string()).max(8).default([]), likelyImpact: modelText(), recommendedAction: modelText(), confidence: confidenceSchema, importance: z.enum(['high', 'medium', 'low']) })).max(12),
  actions: z.array(z.object({ kind: z.enum(['repeat', 'change', 'idea']), title: modelText(100), why: modelText(), what: modelText(), example: modelText().nullable(), evidenceIds: z.array(z.string()).max(8).default([]) })).max(3),
});
export type Candidates = z.infer<typeof candidateSchema>;
const generic = /\b(improve (your )?content quality|use better hooks|make engaging (videos|content)|create engaging content|post (more )?consistently|know your audience|target the right audience|use (more )?high[- ]quality visuals|optimize your (profile|content|strategy))\b/i;
const causal = /\b(will|can|shall|guarantees?|drives?|drove|boosts?|boosted|increases?|increased|improves?|improved|results? in|resulted in|leads? to|led to|generates?|maximizes?|accelerates?|skyrockets?)\s+(more\s+|higher\s+|the\s+|better\s+)?(reach|retention|engagement|views|shares|saves|conversions?|sales|revenue|leads?|customers?|clients?|followers?|inquiries|acquisition)\b|\b(higher|better|greater|increased|maximized)\s+(reach|retention|engagement|views|shares|saves|conversions?|sales|revenue|leads?|customers?|clients?|followers?|acquisition)\b/i;
const weight = { high: 3, medium: 2, low: 1 };
const words = (text: string) => new Set(text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter((w) => w.length > 3));
export function overlaps(a: string, b: string): boolean {
  const left = words(a), right = words(b);
  return Boolean(left.size && right.size) && [...left].filter((w) => right.has(w)).length / Math.min(left.size, right.size) > .55;
}
export function rankFindings(data: Candidates, sources: DeepSource[], format: string): PriorityFinding[] {
  const selected: { finding: PriorityFinding; score: number }[] = [];
  for (const candidate of data.findings) {
    if (candidate.status === 'insufficient_evidence' || candidate.confidence === 'low' || ['competitor_and_trend_context', 'performance_diagnosis', 'audience_psychology'].includes(candidate.category)) continue;
    if (format === 'text' && ['visual_quality', 'audio_and_speech', 'timeline_analysis'].includes(candidate.category)) continue;
    if (!['video', 'reel', 'short', 'carousel'].includes(format) && candidate.category === 'audio_and_speech') continue;
    const evidenceIds = candidate.evidenceIds;
    if (!evidenceIds.length) continue;
    const evidence = [...new Set(evidenceIds)].map((id) => sources.find((s) => s.id === id));
    if (evidence.some((e) => !e || ['low'].includes(e.confidence))) continue;
    if (candidate.category === 'visual_quality' && !evidence.some((e) => e && ['image', 'video_frame', 'on_screen_text', 'document'].includes(e.source))) continue;
    if (candidate.category === 'audio_and_speech' && !evidence.some((e) => e?.source === 'audio')) continue;
    if (generic.test(candidate.recommendedAction.trim()) || generic.test(candidate.finding.trim()) || causal.test(`${candidate.title} ${candidate.explanation} ${candidate.finding} ${candidate.likelyImpact} ${candidate.recommendedAction}`)) continue;
    const confidence = evidence.some((e) => e!.confidence === 'medium') ? 'medium' : candidate.confidence;
    const finding: PriorityFinding = { id: '', category: candidate.category, title: candidate.title, status: candidate.status, explanation: candidate.explanation, finding: candidate.finding, evidence: evidence as DeepSource[], likelyImpact: candidate.likelyImpact, recommendedAction: candidate.recommendedAction, confidence, claimType: 'inferred', priority: 0 };
    selected.push({ finding, score: weight[confidence] * 4 + weight[candidate.importance] * 2 + (candidate.status === 'needs_attention' ? 2 : 0) + Math.min(evidence.length, 3) });
  }
  const ranked: PriorityFinding[] = [];
  for (const { finding } of selected.sort((a, b) => b.score - a.score)) {
    if (ranked.some((f) => f.category === finding.category || overlaps(f.finding, finding.finding) || overlaps(f.title, finding.title) || overlaps(`${f.finding} ${f.explanation}`, `${finding.finding} ${finding.explanation}`))) continue;
    ranked.push({ ...finding, id: `finding_${ranked.length + 1}`, priority: ranked.length + 1 });
    if (ranked.length === 5) break;
  }
  return ranked;
}
export function validateActions(data: Candidates, sources: DeepSource[]): DeepAction[] {
  const result: DeepAction[] = [];
  for (const action of data.actions) {
    if (result.some((a) => a.kind === action.kind || overlaps(a.what, action.what) || overlaps(a.title, action.title))) continue;
    const evidenceIds = action.evidenceIds;
    if (!evidenceIds.length || evidenceIds.some((id) => !sources.some((s) => s.id === id && s.confidence !== 'low'))) continue;
    if (generic.test(action.what.trim()) || generic.test(action.title.trim()) || causal.test(`${action.title} ${action.why} ${action.what} ${action.example ?? ''}`) || /\b(re-?edit|repost|re-upload|reupload)\b/i.test(action.what)) continue;
    result.push({ ...action, evidenceIds, id: `action_${action.kind}` });
  }
  return result.slice(0, 3);
}
