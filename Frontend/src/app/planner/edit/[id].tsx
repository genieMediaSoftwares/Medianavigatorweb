import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { fetchConnections } from '@/features/connections/api';
import { PLATFORM_ORDER } from '@/features/connections/platforms';
import { fetchPlan, updatePlan } from '@/features/planner/api';
import { PlanForm } from '@/features/planner/components/PlanForm';
import { refreshDeviceReminders } from '@/features/planner/deviceReminders';
import { usePlannerTimezone } from '@/features/planner/usePlannerTimezone';
import { useApiResource } from '@/hooks/useApiResource';

const loadConnections = fetchConnections;

export default function EditPlanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { timezone } = usePlannerTimezone();
  const fetcher = useCallback(() => fetchPlan(id), [id]);
  const plan = useApiResource(fetcher);
  const connections = useApiResource(loadConnections);

  if (plan.state.status === 'loading' || connections.state.status === 'loading') return <LoadingState message="Loading plan…" />;
  if (plan.state.status !== 'success') return <ErrorState message={plan.state.message} onRetry={plan.reload} />;
  const connected = connections.state.status === 'success' ? PLATFORM_ORDER.filter((p) => connections.state.status === 'success' && connections.state.data.find((c) => c.platform === p)?.connected) : [];

  return (
    <PlanForm
      key={plan.state.data.plan.updatedAt}
      mode="edit"
      plan={plan.state.data.plan}
      timezone={timezone}
      connectedPlatforms={connected}
      onSubmit={async (patch) => {
        if (Object.keys(patch).length) {
          await updatePlan(id, patch);
          void refreshDeviceReminders();
        }
        router.back();
      }}
    />
  );
}
