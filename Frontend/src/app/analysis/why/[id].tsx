import { Stack, useLocalSearchParams } from 'expo-router';

import { ContentAnalysisView } from '@/features/analysis/ContentAnalysisView';

/**
 * Why Top? / Why Bottom?: the saved six-point analysis of why this post is in the top or needs-attention
 * list (POST /intelligence/content-analysis, type why_top / why_bottom), built over the post's real media.
 */
export default function WhyScreen() {
  const params = useLocalSearchParams<{ id: string; kind?: string; rank?: string }>();
  const kind = params.kind === 'bottom' ? 'why_bottom' : 'why_top';
  return (
    <>
      <Stack.Screen options={{ title: kind === 'why_top' ? 'Why Top?' : 'Why Bottom?' }} />
      <ContentAnalysisView key={`${params.id}:${kind}`} mediaId={params.id} type={kind} rank={params.rank || undefined} />
    </>
  );
}
