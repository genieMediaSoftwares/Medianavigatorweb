import { describe, expect, it } from 'vitest';
import { deepEvidenceScope } from '@/features/analysis/deepEvidenceScope';
import type { DeepAnalysisV2, DeepSource } from '../../shared/deepAnalysisV2';
const report = (...types: DeepSource['source'][]) => ({ processing: { sources: types.map((source) => ({ source })) } }) as DeepAnalysisV2;
describe('Deep Analysis evidence scope', () => {
  it('labels caption/title-only evidence independently of a declared video format', () => {
    expect(deepEvidenceScope({ ...report('caption', 'title'), mediaType: 'reel' }).label).toBe('Post text only');
    expect(deepEvidenceScope(report('caption')).detail).toContain('were not assessed');
  });
  it('does not describe an empty report as reviewed content', () => {
    expect(deepEvidenceScope(report()).label).toBe('No content assessed');
  });
  it('recognizes media evidence without claiming exhaustive coverage', () => {
    expect(deepEvidenceScope(report('caption', 'image')).label).toBe('Original content evidence');
    expect(deepEvidenceScope(report('video_frame')).detail).toContain('Coverage limits');
  });
});
