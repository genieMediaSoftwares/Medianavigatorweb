import { z } from 'zod';
import { DEEP_CATEGORIES } from '../../../../shared/deepAnalysisV2.js';
import { OVERVIEW_SECTIONS } from '../../../../shared/deepOverview.js';
import { confidenceSchema, statusSchema, shortText } from './deepV2.validation.js';
const claim = z.enum(['measured', 'observed', 'calculated', 'inferred', 'unavailable']);
const source = z.object({ id: z.string(), source: z.enum(['video_frame', 'audio', 'image', 'document', 'on_screen_text', 'caption', 'title', 'comment', 'metric']), assetId: z.string().nullable(), startSeconds: z.number().finite().nonnegative().nullable(), endSeconds: z.number().finite().nonnegative().nullable(), slideNumber: z.number().int().positive().nullable(), pageNumber: z.number().int().positive().nullable(), quote: z.string().nullable(), description: z.string(), claimType: claim, confidence: confidenceSchema });
export const reportV2Schema = z.object({
  postId: z.string(), accountId: z.string(), platform: z.enum(['instagram', 'facebook', 'youtube', 'linkedin']), mediaType: z.string(), post: z.object({ title: z.string(), caption: z.string(), publishedAt: z.string().datetime() }), goal: z.string(), analysisStatus: z.enum(['complete', 'partial']), analysisVersion: z.string(), generatedAt: z.string().datetime(),
  coverage: z.object({ accessibleDurationSeconds: z.number().finite().nonnegative().nullable(), analyzedDurationSeconds: z.number().finite().nonnegative(), isComplete: z.boolean(), accessibleAssets: z.number().int().nonnegative(), analyzedAssets: z.number().int().nonnegative(), limitations: z.array(z.string()), notes: z.array(z.string()).optional(), method: z.string() }),
  overview: z.object({ editorial: z.object({
    headline: z.string().min(1).max(120), introduction: z.string().min(1).max(1200), verdict: z.string().min(1).max(800), evidenceIds: z.array(z.string()).min(1),
    sections: z.array(z.object({ key: z.enum(OVERVIEW_SECTIONS), title: z.string().min(1).max(120), assessment: z.string().min(1).max(1100), status: z.enum(['strong', 'good', 'needs_attention']), evidenceIds: z.array(z.string()).min(1) })).min(1).max(8),
    facts: z.array(z.object({ label: z.string(), value: z.string(), quote: z.string(), evidenceId: z.string() })).max(10),
    metrics: z.object({ syncedAt: z.string().datetime(), items: z.array(z.object({ key: z.string(), label: z.string(), value: z.number().finite().nonnegative(), unit: z.enum(['count', 'percent', 'minutes']), basis: z.enum(['measured', 'calculated']) })) }),
  }).optional(), summary: shortText, strongestQuality: shortText.nullable(), mainOpportunity: shortText.nullable(), keyTakeaway: shortText, timeline: z.array(z.object({ assetId: z.string(), label: z.string(), startSeconds: z.number().finite().nonnegative().nullable(), endSeconds: z.number().finite().nonnegative().nullable(), slideNumber: z.number().int().positive().nullable(), status: z.enum(['strong', 'good', 'review', 'needs_attention', 'insufficient_evidence']), evidenceIds: z.array(z.string()) })), priorityFindings: z.array(z.object({ id: z.string(), category: z.enum(DEEP_CATEGORIES), title: z.string(), status: statusSchema, explanation: z.string(), finding: shortText, evidence: z.array(source).min(1), likelyImpact: shortText, recommendedAction: shortText, confidence: confidenceSchema, claimType: claim, priority: z.number().int().positive() })).max(5) }),
  audience: z.object({ availability: z.enum(['available', 'unavailable']), findings: z.array(z.object({ id: z.string(), section: z.enum(['response', 'questions', 'motivations', 'signals', 'demand']), title: z.string(), text: z.string(), label: z.enum(['measured', 'observed_in_comments', 'ai_interpretation']), evidence: z.array(source).min(1), confidence: confidenceSchema })).max(5), limitations: z.array(z.string()), sampledComments: z.number().int().nonnegative(), collectedAt: z.string().datetime() }),
  nextMove: z.object({ actions: z.array(z.object({ id: z.string(), kind: z.enum(['repeat', 'change', 'idea']), title: z.string(), why: shortText, what: shortText, example: shortText.nullable(), evidenceIds: z.array(z.string()).min(1) })).max(3) }),
  processing: z.object({ model: z.string(), promptVersion: z.string(), validatedAt: z.string().datetime(), categoryEngine: z.array(z.enum(DEEP_CATEGORIES)), sources: z.array(source) }),
}).superRefine((report, ctx) => {
  if ((report.analysisStatus === 'complete') !== report.coverage.isComplete || (report.coverage.isComplete && report.coverage.accessibleAssets === 0)) ctx.addIssue({ code: 'custom', message: 'Analysis status contradicts coverage' });
  if (report.coverage.analyzedAssets > report.coverage.accessibleAssets || (report.coverage.accessibleDurationSeconds !== null && report.coverage.analyzedDurationSeconds > report.coverage.accessibleDurationSeconds + .1)) ctx.addIssue({ code: 'custom', message: 'Coverage exceeds accessible content' });
  if (report.coverage.isComplete && (report.analysisStatus !== 'complete' || report.coverage.limitations.length || report.coverage.analyzedAssets !== report.coverage.accessibleAssets)) ctx.addIssue({ code: 'custom', message: 'Complete coverage is not supported' });
  const sources = new Set(report.processing.sources.map((s) => s.id));
  for (const segment of report.overview.timeline) {
    if (segment.evidenceIds.some((id) => !sources.has(id)) || (segment.startSeconds !== null && segment.endSeconds !== null && segment.startSeconds >= segment.endSeconds)) ctx.addIssue({ code: 'custom', message: 'Invalid timeline evidence or range' });
  }
  for (const finding of report.overview.priorityFindings) if (finding.evidence.some((s) => !sources.has(s.id))) ctx.addIssue({ code: 'custom', message: 'Unknown finding source' });
  if (report.overview.editorial) {
    const editorial = report.overview.editorial;
    const known = (ids: string[]) => ids.every((id) => sources.has(id));
    if (!known(editorial.evidenceIds) || editorial.sections.some((section) => !known(section.evidenceIds)) || new Set(editorial.sections.map((section) => section.key)).size !== editorial.sections.length) ctx.addIssue({ code: 'custom', message: 'Invalid editorial evidence or repeated section' });
    for (const fact of editorial.facts) {
      const evidence = report.processing.sources.find((source) => source.id === fact.evidenceId);
      if (!evidence?.quote?.includes(fact.quote) || !fact.quote.includes(fact.value)) ctx.addIssue({ code: 'custom', message: 'The fact is not present in the cited original text' });
    }
  }
  for (const action of report.nextMove.actions) if (action.evidenceIds.some((id) => !sources.has(id))) ctx.addIssue({ code: 'custom', message: 'Unknown recommendation source' });
});
