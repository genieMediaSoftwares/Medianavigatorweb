import type { DeepAnalysisV2 } from '../../../../shared/deepAnalysisV2';

/** Derive scope from validated evidence, not from the post's declared media format. */
export function deepEvidenceScope(report: DeepAnalysisV2): { label: string; detail: string } {
  const sources = report.processing.sources;
  if (!sources.length) return { label: 'No content assessed', detail: 'No usable evidence was extracted. Refresh analysis to retry.' };
  const textOnly = sources.every((source) => source.source === 'caption' || source.source === 'title');
  if (textOnly && report.mediaType === 'text') return { label: 'Written post', detail: 'This review uses the selected post’s available written content.' };
  if (textOnly) return { label: 'Post text only', detail: 'This review uses the available caption and title. The original images, video and audio were not assessed.' };
  return { label: 'Original content evidence', detail: 'Findings cite the selected post’s accessible media and text. Coverage limits are listed below.' };
}
