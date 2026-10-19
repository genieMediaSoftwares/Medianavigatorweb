import { apiRequest } from '@/lib/api/client';
import type { BestTimes, NewPlansInput, Plan, PlanMatches, PlannerMetricKey, PlannerRange, PlannerScope, PlanReview, PlanUpdate, StoredPlanStatus } from '@/types/api';

/** Evidence-based best times for one platform's account (or all accounts combined), from its own synced posts. */
export function fetchBestTimes(params: { platform: PlannerScope; days: PlannerRange; metric?: PlannerMetricKey; contentType?: string }): Promise<BestTimes> {
  return apiRequest<BestTimes>('/planner/best-times', { auth: true, query: params });
}

/** Dated plans planned within [from, to), earliest first. The server allows at most 120 days per request. */
export function fetchPlansInRange(range: { from: string; to: string }): Promise<Plan[]> {
  return apiRequest<Plan[]>('/planner/plans', { auth: true, query: range });
}

/** Ideas, undated drafts, and older plans that still need a date. */
export function fetchUndatedPlans(): Promise<Plan[]> {
  return apiRequest<Plan[]>('/planner/plans', { auth: true, query: { undated: 'true' } });
}

export function fetchPlan(id: string): Promise<{ plan: Plan; group: Plan[] }> {
  return apiRequest(`/planner/${encodeURIComponent(id)}`, { auth: true });
}

/** One idea for one or more platforms; each platform gets its own plan. */
export function createPlans(input: NewPlansInput): Promise<{ groupId: string | null; plans: Plan[] }> {
  return apiRequest('/planner', { method: 'POST', auth: true, json: input });
}

export function updatePlan(id: string, patch: PlanUpdate): Promise<Plan> {
  return apiRequest<Plan>(`/planner/${encodeURIComponent(id)}`, { method: 'PATCH', auth: true, json: patch });
}

export function setPlanStatus(id: string, body: { status: Exclude<StoredPlanStatus, 'published'>; localDate?: string; localTime?: string; timezone?: string }): Promise<Plan> {
  return apiRequest<Plan>(`/planner/${encodeURIComponent(id)}/status`, { method: 'POST', auth: true, json: body });
}

/** Mark published: link a synced post (`mediaId`), or record it manually with an optional link. */
export function publishPlan(id: string, body: { mediaId?: string; url?: string }): Promise<Plan> {
  return apiRequest<Plan>(`/planner/${encodeURIComponent(id)}/publish`, { method: 'POST', auth: true, json: body });
}

export function fetchPlanMatches(id: string): Promise<PlanMatches> {
  return apiRequest<PlanMatches>(`/planner/${encodeURIComponent(id)}/matches`, { auth: true });
}

export function fetchPlanReview(id: string): Promise<PlanReview> {
  return apiRequest<PlanReview>(`/planner/${encodeURIComponent(id)}/review`, { auth: true });
}

export function removePlan(id: string): Promise<unknown> {
  return apiRequest(`/planner/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
}
