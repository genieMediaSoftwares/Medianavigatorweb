import type { DeepSource } from '../../../../shared/deepAnalysisV2.js';
/** Preserve platform text verbatim; no AI-generated substitute quotations. */
export function postTextSources(caption: string, title: string, offset = 0): DeepSource[] {
  const sources: DeepSource[] = [];
  for (const [field, value] of [['caption', caption], ['title', title]] as const) {
    for (let start = 0; start < value.length; start += 1200) {
      const quote = value.slice(start, start + 1200);
      if (!quote.trim()) continue;
      sources.push({ id: `source_${offset + sources.length + 1}`, source: field, assetId: null, startSeconds: null, endSeconds: null, slideNumber: null, pageNumber: null, quote, description: `Original post ${field}, characters ${start + 1}–${start + quote.length}.`, claimType: 'observed', confidence: 'high' });
    }
  }
  return sources;
}
