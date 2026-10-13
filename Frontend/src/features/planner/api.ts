import { apiRequest } from '@/lib/api/client';
import type { BestTimes, NewPlannedItem, PlannedItem, PlannerInsights, PlannerMetricKey, PlannerRange, PlannerScope } from '@/types/api';

/** Evidence-based best times for one platform's account (or all accounts combined), from its own synced posts. */
export function fetchBestTimes(params: { platform: PlannerScope; days: PlannerRange; metric?: PlannerMetricKey; contentType?: string }): Promise<BestTimes> {
  return apiRequest<BestTimes>('/planner/best-times', { auth: true, query: params });
}

/** Best windows, formats and topics measured from the user's own history. */
export function fetchPlannerInsights(): Promise<PlannerInsights> {
  return apiRequest<PlannerInsights>('/planner/insights', { auth: true });
}

export function fetchPlannedItems(): Promise<PlannedItem[]> {
  return apiRequest<PlannedItem[]>('/planner', { auth: true });
}

export function addPlannedItem(item: NewPlannedItem): Promise<PlannedItem> {
  return apiRequest<PlannedItem>('/planner', { method: 'POST', auth: true, json: item });
}

export function removePlannedItem(id: string): Promise<unknown> {
  return apiRequest(`/planner/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
}
