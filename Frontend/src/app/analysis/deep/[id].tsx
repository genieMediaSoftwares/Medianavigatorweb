import { useLocalSearchParams } from 'expo-router';

import { ContentAnalysisView } from '@/features/analysis/ContentAnalysisView';

/**
 * Deep Analysis: the saved six-point analysis of this post's actual content (full video with audio,
 * image or carousel slides) and how it relates to the post's measured performance.
 */
export default function DeepAnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContentAnalysisView key={id} mediaId={id} type="deep" />;
}
