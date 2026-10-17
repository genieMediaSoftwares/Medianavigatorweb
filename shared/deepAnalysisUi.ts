import type { DeepAnalysisState } from './deepAnalysisV2.js';
export const DEEP_TABS = ['Overview', 'Audience', 'Next Move'] as const;
export type DeepTab = typeof DEEP_TABS[number];
export interface DeepUiState { postId: string; tab: DeepTab; expanded: Record<string, boolean>; job: DeepAnalysisState | null; loading: boolean; error: string | null }
export const initialDeepUi = (postId: string): DeepUiState => ({ postId, tab: 'Overview', expanded: {}, job: null, loading: true, error: null });
export type DeepUiEvent = { type: 'tab'; tab: DeepTab } | { type: 'toggle'; id: string } | { type: 'begin' } | { type: 'received'; job: DeepAnalysisState } | { type: 'failed'; message: string; postId: string };
export function deepUiReducer(state: DeepUiState, event: DeepUiEvent): DeepUiState {
  if (event.type === 'tab') return { ...state, tab: event.tab };
  if (event.type === 'toggle') return { ...state, expanded: { ...state.expanded, [event.id]: !state.expanded[event.id] } };
  if (event.type === 'begin') return { ...state, loading: true, error: null };
  if (event.type === 'failed') return event.postId === state.postId ? { ...state, loading: false, error: event.message } : state;
  if (event.job.postId !== state.postId || (event.job.report && event.job.report.postId !== state.postId)) return state;
  const changedReport = Boolean(state.job?.report && event.job.report && state.job.report.generatedAt !== event.job.report.generatedAt);
  return { ...state, expanded: changedReport ? {} : state.expanded, job: event.job, loading: ['queued', 'processing'].includes(event.job.status), error: event.job.error };
}
