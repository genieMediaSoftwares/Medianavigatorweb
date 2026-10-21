import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { fetchConnections } from '@/features/connections/api';
import { isPlatform, PLATFORM_ORDER } from '@/features/connections/platforms';
import { createPlans } from '@/features/planner/api';
import { isValidLocalDate, isValidLocalTime } from '@/features/planner/dates';
import { prefillFromRecommendation } from '@/features/planner/ideaPrefill';
import { refreshDeviceReminders } from '@/features/planner/deviceReminders';
import { PlanForm, type PlanSource } from '@/features/planner/components/PlanForm';
import { PLAN_FORMATS } from '@/features/planner/planRules';
import { usePlannerTimezone } from '@/features/planner/usePlannerTimezone';
import { useApiResource } from '@/hooks/useApiResource';
import type { ContentAnalysisType, PlanFormat } from '@/types/api';

/** A synced post type → the planning format to suggest for that platform, when there is a clear one. */
const FORMAT_FOR_TYPE: Record<string, PlanFormat> = { reel: 'reel', short: 'short', video: 'video', carousel: 'carousel' };
const ANALYSIS_TYPES: ContentAnalysisType[] = ['deep', 'why_top', 'why_bottom'];

type Params = {
  date?: string; time?: string; platform?: string; title?: string; format?: string;
  /** Planning an idea from a saved analysis ("Plan this idea"). */
  sourceMediaId?: string; sourceType?: string; recIndex?: string; recText?: string;
};

const loadConnections = fetchConnections;

/**
 * New content plan. Parameters only pre-fill the form; nothing is saved until the user taps Save. Every navigation
 * here pushes a fresh screen, and the form is keyed by its parameters, so old parameters can't reappear.
 */
export default function NewPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { timezone } = usePlannerTimezone();
  const connections = useApiResource(loadConnections);

  if (connections.state.status === 'loading') return <LoadingState message="Loading…" />;
  if (connections.state.status !== 'success') return <ErrorState message={connections.state.message} onRetry={connections.reload} />;

  const connected = PLATFORM_ORDER.filter((p) => connections.state.status === 'success' && connections.state.data.find((c) => c.platform === p)?.connected);
  const platform = isPlatform(params.platform) ? params.platform : undefined;
  const suggested = params.format ? FORMAT_FOR_TYPE[params.format] ?? (params.format as PlanFormat) : null;
  const format = platform && suggested && PLAN_FORMATS[platform].includes(suggested) ? suggested : null;
  const recIndex = Number(params.recIndex);
  const source: PlanSource | undefined =
    params.sourceMediaId && ANALYSIS_TYPES.includes(params.sourceType as ContentAnalysisType) && Number.isInteger(recIndex) && recIndex >= 0 && params.recText
      ? { mediaId: params.sourceMediaId, analysisType: params.sourceType as ContentAnalysisType, recommendationIndex: recIndex, recommendationText: params.recText, platform }
      : undefined;

  // A long script becomes a short Title heading plus the full Idea, instead of 300 characters in the Title.
  const prefill = prefillFromRecommendation({ title: params.title, recommendation: params.recText });

  return (
    <PlanForm
      key={JSON.stringify(params)}
      mode="create"
      timezone={timezone}
      connectedPlatforms={connected}
      source={source}
      initial={{ title: prefill.title, description: prefill.description, descriptionTruncated: prefill.descriptionTruncated, platform, format, date: isValidLocalDate(params.date) ? params.date : null, time: isValidLocalTime(params.time) ? params.time : null }}
      onSubmit={async (input) => {
        const { plans } = await createPlans(input);
        void refreshDeviceReminders();
        // One plan opens; several go back to the planner where they all show.
        if (plans.length === 1) router.replace({ pathname: '/planner/[id]', params: { id: plans[0].id } });
        else router.back();
      }}
    />
  );
}
