import { apiRequest } from '@/lib/api/client';
import type { NewPlannedItem, PlannedItem, PlannerInsights } from '@/types/api';

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
