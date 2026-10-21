import type { useRouter } from 'expo-router';

import type { ContentAnalysisType } from '@/types/api';

/** Opens a saved content analysis (Deep Analysis, Why Top?, Why Bottom?) for a post. */
export function openAnalysis(router: ReturnType<typeof useRouter>, mediaId: string, type: ContentAnalysisType) {
  if (type === 'deep') router.push({ pathname: '/analysis/deep/[id]', params: { id: mediaId } });
  else router.push({ pathname: '/analysis/why/[id]', params: { id: mediaId, kind: type === 'why_top' ? 'top' : 'bottom' } });
}
