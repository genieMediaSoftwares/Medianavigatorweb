import { z } from 'zod';
import type { DeepAction, DeepSource, PriorityFinding } from '../../../../shared/deepAnalysisV2.js';
import { OVERVIEW_SECTIONS, type DeepOverview, type OverviewSectionKey } from '../../../../shared/deepOverview.js';
import type { ContentItemDoc } from '../../models/ContentItem.js';
import { config } from '../../config/env.js';
import { AiFailedError, generateMultimodalJson } from './geminiClient.js';
import { OVERVIEW_SYSTEM } from './deepV2.prompts.js';
import { overviewMetrics } from './deepV2.metrics.js';
const prose = (max: number) => z.string().trim().min(1).max(6000).transform((value) => value.slice(0, max));
const ids = z.array(z.string()).min(1).max(12);
export const overviewDraftSchema = z.object({
  headline: prose(120), introduction: prose(1200), verdict: prose(800), evidenceIds: ids,
  sections: z.array(z.object({ key: z.enum(OVERVIEW_SECTIONS), title: prose(120), assessment: prose(1100), status: z.enum(['strong', 'good', 'needs_attention']), evidenceIds: ids })).min(1).max(8),
  facts: z.array(z.object({ label: prose(70), value: prose(300), quote: z.string().trim().min(1).max(1200), evidenceId: z.string() })).max(10),
  actions: z.array(z.object({ kind: z.enum(['repeat', 'change', 'idea']), title: prose(100), why: prose(700), what: prose(700), example: prose(700).nullable(), evidenceIds: ids })).max(3),
});
export type OverviewDraft = z.infer<typeof overviewDraftSchema>;
const unsupportedOutcome = /\b(guarantee[sd]?|proven to|caused|will (?:increase|boost|improve|drive)|went viral|retained \d|algorithm (?:favou?red|promoted))\b/i;
const visual = (s: DeepSource) => ['image', 'video_frame', 'document', 'on_screen_text'].includes(s.source);
const text = (s: DeepSource) => ['caption', 'title'].includes(s.source);
const categories = { message: 'hook_intelligence', visual: 'visual_quality', caption: 'caption_and_discovery', structure: 'storytelling_and_pacing', audio: 'audio_and_speech', details: 'caption_and_discovery', alignment: 'mistakes_and_opportunities', cta: 'cta_and_conversion' } as const;
export function requiredOverviewSections(sources: DeepSource[], format: string): OverviewSectionKey[] {
  const keys: OverviewSectionKey[] = ['message'];
  if (sources.some(visual)) keys.push('visual');
  if (sources.some(text)) keys.push('caption');
  if (sources.some((s) => s.startSeconds !== null) || (format === 'carousel' && sources.some((s) => s.slideNumber !== null))) keys.push('structure');
  if (sources.some((s) => s.source === 'audio')) keys.push('audio');
  if (sources.some(text) && sources.some(visual)) keys.push('alignment');
  keys.push('cta'); return keys;
}
/** Validate original source references and format applicability, never substitute evidence. */
export function groundOverview(draft: OverviewDraft, sources: DeepSource[], required: OverviewSectionKey[]) {
  const get = (references: string[]) => references.map((id) => sources.find((s) => s.id === id && s.confidence !== 'low'));
  const valid = (references: string[]) => references.length > 0 && get(references).every(Boolean);
  if (!valid(draft.evidenceIds) || unsupportedOutcome.test(`${draft.headline} ${draft.introduction} ${draft.verdict}`)) throw new AiFailedError('Ground the introduction and verdict in the supplied post observations.', 'invalid_response');
  const sections: DeepOverview['sections'] = [];
  for (const section of draft.sections) {
    if (!valid(section.evidenceIds) || sections.some((s) => s.key === section.key) || unsupportedOutcome.test(section.assessment)) continue;
    const evidence = get(section.evidenceIds) as DeepSource[];
    if (section.key === 'visual' && !evidence.some(visual)) continue;
    if (section.key === 'caption' && !evidence.some(text)) continue;
    if (section.key === 'audio' && !evidence.some((s) => s.source === 'audio')) continue;
    if (section.key === 'structure' && !evidence.some((s) => s.startSeconds !== null || s.slideNumber !== null)) continue;
    if (section.key === 'alignment' && !(evidence.some(text) && evidence.some(visual))) continue;
    sections.push({ ...section, evidenceIds: [...new Set(section.evidenceIds)] });
  }
  const missing = required.filter((key) => !sections.some((s) => s.key === key));
  if (missing.length) throw new AiFailedError(`Include grounded assessments for: ${missing.join(', ')}.`, 'invalid_response');
  const facts = draft.facts.filter((fact) => sources.find((s) => s.id === fact.evidenceId)?.quote?.includes(fact.quote) && fact.quote.includes(fact.value)).filter((fact, index, all) => all.findIndex((f) => f.label.toLowerCase() === fact.label.toLowerCase() && f.value === fact.value) === index);
  const actions: DeepAction[] = [];
  for (const action of draft.actions) {
    if (!valid(action.evidenceIds) || actions.some((a) => a.kind === action.kind) || unsupportedOutcome.test(`${action.why} ${action.what}`)) continue;
    actions.push({ ...action, id: `action_${action.kind}` });
  }
  return { headline: draft.headline, introduction: draft.introduction, verdict: draft.verdict, evidenceIds: draft.evidenceIds, sections, facts, actions };
}
export async function generateOverview(doc: ContentItemDoc, caption: string, format: string, scope: string, goal: string, sources: DeepSource[]) {
  if (!sources.length) throw new AiFailedError('No usable post content was available. Reconnect the owning account and retry.', 'invalid_response');
  const requiredSections = requiredOverviewSections(sources, format);
  const input = { post: { id: doc.legacyId, platform: doc.platform, format, title: doc.title, caption }, scope, goal, requiredSections, observations: sources };
  let correction = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const generated = await generateMultimodalJson({ system: OVERVIEW_SYSTEM, parts: [{ text: JSON.stringify(input) }, ...(correction ? [{ text: correction }] : [])], schema: overviewDraftSchema, timeoutMs: config.ai.contentAnalysis.timeoutMs });
      const result = groundOverview(overviewDraftSchema.parse(generated.data), sources, requiredSections);
      const { actions, ...review } = result;
      const editorial: DeepOverview = { ...review, metrics: overviewMetrics(doc) };
      const findings: PriorityFinding[] = result.sections.slice(0, 5).map((section, index) => ({ id: `finding_${index + 1}`, category: categories[section.key], title: section.title, status: section.status, explanation: section.assessment.slice(0, 200), finding: section.assessment.slice(0, 700), evidence: section.evidenceIds.map((id) => sources.find((s) => s.id === id)!), likelyImpact: 'Creative assessment; audience outcomes are not established by the creative alone.', recommendedAction: 'See the recommendations at the end of this review.', confidence: 'medium', claimType: 'inferred', priority: index + 1 }));
      return { editorial, findings, actions, model: generated.model };
    } catch (error) {
      if (attempt || (!(error instanceof AiFailedError) && !(error instanceof z.ZodError))) throw error;
      if (error instanceof AiFailedError && error.reason !== 'invalid_response') throw error;
      correction = `Repair the structured report using the SAME post evidence. ${error instanceof AiFailedError ? error.message : 'Match the exact JSON structure.'} Include all requiredSections with matching evidenceIds; do not fabricate facts or use generic fallback strengths. Unsupported actions can be omitted without discarding the overview.`;
    }
  }
  throw new AiFailedError('The post review could not be completed. Please retry.', 'invalid_response');
}
