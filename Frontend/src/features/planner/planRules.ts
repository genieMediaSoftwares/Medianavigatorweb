/**
 * Planner rules shared by the screens: formats, status lifecycle, reminders, checklists, sorting and grouping.
 * Mirrors backend/src/services/planner/plans.ts (the server validates every change).
 */
import type { Plan, PlanFormat, PlanGoal, PlanStatus, Platform, StoredPlanStatus } from '@/types/api';

import type { LocalDate } from './dates';

export const PLAN_FORMATS: Record<Platform, readonly PlanFormat[]> = {
  instagram: ['reel', 'image', 'carousel', 'story'],
  facebook: ['reel', 'video', 'image', 'text'],
  youtube: ['short', 'video'],
  linkedin: ['text', 'image', 'video', 'document'],
};

export const FORMAT_LABEL: Record<PlanFormat, string> = {
  reel: 'Reel', image: 'Image', carousel: 'Carousel', story: 'Story', video: 'Video', text: 'Text post', short: 'Short', document: 'Document',
};

/** The synced post type a format is measured as (best times, matching). null = the platform's API doesn't return it. */
export const FORMAT_CONTENT_TYPE: Record<Platform, Partial<Record<PlanFormat, string | null>>> = {
  instagram: { reel: 'reel', image: 'post', carousel: 'carousel', story: null },
  facebook: { reel: 'video', video: 'video', image: 'post', text: 'post' },
  youtube: { short: 'short', video: 'video' },
  linkedin: { text: 'post', image: 'post', video: 'video', document: 'post' },
};

export const GOALS: { value: PlanGoal; label: string }[] = [
  { value: 'reach', label: 'Reach' }, { value: 'engagement', label: 'Engagement' }, { value: 'followers', label: 'Followers' },
  { value: 'traffic', label: 'Traffic' }, { value: 'sales', label: 'Sales' }, { value: 'community', label: 'Community' }, { value: 'other', label: 'Other' },
];

export const TRANSITIONS: Record<StoredPlanStatus, readonly StoredPlanStatus[]> = {
  idea: ['draft', 'planned', 'cancelled'],
  draft: ['idea', 'planned', 'ready', 'published', 'cancelled'],
  planned: ['idea', 'draft', 'ready', 'published', 'cancelled'],
  ready: ['idea', 'draft', 'planned', 'published', 'cancelled'],
  published: ['ready'],
  cancelled: ['idea', 'draft', 'planned'],
};
export const canTransition = (from: StoredPlanStatus, to: StoredPlanStatus) => from === to || TRANSITIONS[from].includes(to);

/** Status label and colors. Every status pairs text with an icon, never color alone. */
export const STATUS_META: Record<PlanStatus, { label: string; icon: 'bulb-outline' | 'create-outline' | 'calendar-outline' | 'checkmark-circle-outline' | 'rocket-outline' | 'alert-circle-outline' | 'close-circle-outline'; container: string; text: string }> = {
  idea: { label: 'Idea', icon: 'bulb-outline', container: 'bg-violet-light', text: 'text-violet' },
  draft: { label: 'Draft', icon: 'create-outline', container: 'bg-neutral-100', text: 'text-neutral-500' },
  planned: { label: 'Planned', icon: 'calendar-outline', container: 'bg-sky', text: 'text-primary' },
  ready: { label: 'Ready', icon: 'checkmark-circle-outline', container: 'bg-success-light', text: 'text-success' },
  published: { label: 'Published', icon: 'rocket-outline', container: 'bg-success-light', text: 'text-success' },
  missed: { label: 'Missed', icon: 'alert-circle-outline', container: 'bg-warning-light', text: 'text-warning' },
  cancelled: { label: 'Cancelled', icon: 'close-circle-outline', container: 'bg-neutral-100', text: 'text-neutral-500' },
};

export const REMINDER_OPTIONS: { offset: number; label: string }[] = [
  { offset: 0, label: 'At time' }, { offset: 15, label: '15 min before' }, { offset: 30, label: '30 min before' },
  { offset: 60, label: '1 hour before' }, { offset: 1440, label: '1 day before' },
];
export const reminderLabel = (offset: number) => REMINDER_OPTIONS.find((o) => o.offset === offset)?.label ?? `${offset} min before`;

const VIDEO = ['Video ready', 'Opening reviewed', 'Caption prepared', 'Cover selected', 'CTA checked', 'Final review complete'];
const VISUAL = ['Visuals ready', 'Slide order reviewed', 'Caption prepared', 'CTA checked', 'Final review complete'];
const SINGLE_IMAGE = ['Visuals ready', 'Caption prepared', 'CTA checked', 'Final review complete'];
const TEXT = ['Opening reviewed', 'Content proofread', 'Links checked', 'CTA checked', 'Final review complete'];

export function defaultChecklist(format: PlanFormat): string[] {
  switch (format) {
    case 'reel': case 'short': case 'video': case 'story': return VIDEO;
    case 'carousel': case 'document': return VISUAL;
    case 'image': return SINGLE_IMAGE;
    case 'text': return TEXT;
  }
}

/** "4 of 6 done". A complete checklist doesn't make a post ready: the user marks it ready. */
export function readiness(plan: Pick<Plan, 'checklist' | 'checklistDone'>): { done: number; total: number; label: string; complete: boolean } {
  const total = plan.checklist.length;
  const done = plan.checklistDone;
  return { done, total, complete: total > 0 && done === total, label: total ? `${done} of ${total} done` : 'No checklist' };
}

/** What the user can do next with a plan, in the order shown. */
export type PlanAction = 'edit' | 'reschedule' | 'pickDate' | 'markReady' | 'markPublished' | 'toIdeas' | 'toDraft' | 'restore' | 'cancel' | 'undoPublish' | 'delete';
export function actionsFor(plan: Pick<Plan, 'status' | 'storedStatus' | 'needsDate' | 'scheduledAt'>): PlanAction[] {
  const s = plan.storedStatus;
  const out: PlanAction[] = [];
  if (s === 'published') return ['undoPublish', 'edit', 'delete'];
  if (s === 'cancelled') return ['restore', 'delete'];
  out.push('edit');
  if (plan.needsDate || s === 'idea') out.push('pickDate');
  else if (plan.scheduledAt) out.push('reschedule');
  if ((s === 'planned' || s === 'draft') && plan.scheduledAt) out.push('markReady');
  if (canTransition(s, 'published') && plan.scheduledAt) out.push('markPublished');
  if (s === 'idea') out.push('toDraft');
  else out.push('toIdeas');
  out.push('cancel', 'delete');
  return out;
}

/** Earliest planned first; undated plans after dated ones, newest first. */
export function sortPlans<T extends Pick<Plan, 'scheduledAt' | 'createdAt' | 'id'>>(plans: T[]): T[] {
  return [...plans].sort((a, b) => {
    if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt) || a.id.localeCompare(b.id);
    if (a.scheduledAt) return -1;
    if (b.scheduledAt) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export type PlatformFilter = Platform | 'all';
export const filterPlans = <T extends Pick<Plan, 'platform'>>(plans: T[], filter: PlatformFilter) => (filter === 'all' ? plans : plans.filter((p) => p.platform === filter));

/** The local date a plan appears on in the calendar: the date the user chose, in the plan's own timezone. */
export const planDate = (p: Pick<Plan, 'localDate'>): LocalDate | null => p.localDate;

/**
 * Main-screen sections. `attention` = missed plans and legacy plans that need a date; `upcoming` = dated and still to do;
 * `ideas` = ideas and undated drafts; `done` = published and cancelled (newest first).
 */
export function groupPlans(plans: Plan[]) {
  const attention: Plan[] = [];
  const upcoming: Plan[] = [];
  const ideas: Plan[] = [];
  const done: Plan[] = [];
  for (const p of sortPlans(plans)) {
    if (p.status === 'published' || p.status === 'cancelled') done.push(p);
    else if (p.status === 'missed' || p.needsDate) attention.push(p);
    else if (!p.scheduledAt) ideas.push(p);
    // Dated and not missed: still to do (a plan just past its time stays here during the server's grace period).
    else upcoming.push(p);
  }
  done.reverse();
  return { attention, upcoming, ideas, done };
}

/** Counts of plans per local date, for calendar dots. Cancelled plans don't count. */
export function countByDate(plans: Plan[]): Map<LocalDate, { total: number; missed: number; published: number }> {
  const out = new Map<LocalDate, { total: number; missed: number; published: number }>();
  for (const p of plans) {
    if (!p.localDate || p.status === 'cancelled') continue;
    const c = out.get(p.localDate) ?? { total: 0, missed: 0, published: 0 };
    c.total++;
    if (p.status === 'missed') c.missed++;
    if (p.status === 'published') c.published++;
    out.set(p.localDate, c);
  }
  return out;
}
