import { Stack, useLocalSearchParams } from 'expo-router';

import { WhyReportView } from '@/features/analysis/WhyReportView';

/**
 * App-only seven-part creative report built from actual media, without metrics or ranking inputs.
 */
export default function WhyScreen() {
  const params = useLocalSearchParams<{ id: string; kind?: string; rank?: string }>();
  const kind = params.kind === 'bottom' ? 'why_bottom' : 'why_top';
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WhyReportView key={`${params.id}:${kind}`} mediaId={params.id} type={kind} />
    </>
  );
}
