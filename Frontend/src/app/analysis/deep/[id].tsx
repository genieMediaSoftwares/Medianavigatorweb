import { Stack, useLocalSearchParams } from 'expo-router';

import { DeepReportView } from '@/features/analysis/DeepReportView';

/**
 * Evidence-first report with Overview, Audience and Next Move tabs for this exact post.
 */
export default function DeepAnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <><Stack.Screen options={{ headerShown: false }} /><DeepReportView key={id} mediaId={id} /></>;
}
