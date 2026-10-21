/**
 * Smart Content Planner rules: formats, the status lifecycle, checklists and reminders.
 * Pure functions only, so the rules are unit-tested without a database.
 */
import type { PlatformType } from '../../../../shared/types.js';

/** Planning formats per platform. These describe what the user will post; Media Navigator never publishes. */
export const PLAN_FORMATS = {
  instagram: ['reel', 'image', 'carousel', 'story'],
  facebook: ['reel', 'video', 'image', 'text'],
  youtube: ['short', 'video'],
  linkedin: ['text', 'image', 'video', 'document'],
} as const satisfies Record<PlatformType, readonly string[]>;
export type PlanFormat = (typeof PLAN_FORMATS)[keyof typeof PLAN_FORMATS][number];
export const ALL_PLAN_FORMATS = [...new Set(Object.values(PLAN_FORMATS).flat())] as PlanFormat[];

/**
 * The synced post type (ContentItem.contentType) a planning format corresponds to, used for best times and
 * for matching a published post. null = the platform's API does not return this kind of post (Stories).
 */
export const FORMAT_CONTENT_TYPE: Record<PlatformType, Record<string, string | null>> = {
  instagram: { reel: 'reel', image: 'post', carousel: 'carousel', story: null },
  // Facebook reports Reels as video posts.
  facebook: { reel: 'video', video: 'video', image: 'post', text: 'post' },
  youtube: { short: 'short', video: 'video' },
  linkedin: { text: 'post', image: 'post', video: 'video', document: 'post' },
};

/** Legacy free-text formats ("Post", "reel") → the closest planning format, for display only. */
export function formatFromLegacy(platform: PlatformType, contentType: string | undefined): PlanFormat | null {
  const t = (contentType ?? '').trim().toLowerCase();
  const allowed = PLAN_FORMATS[platform] as readonly string[];
  if (allowed.includes(t)) return t as PlanFormat;
  const alias: Record<string, string> = { post: platform === 'linkedin' || platform === 'facebook' ? 'text' : 'image', short: 'short', video: 'video', carousel: 'carousel', article: 'text' };
  const a = alias[t];
  return a && allowed.includes(a) ? (a as PlanFormat) : null;
}

export const STORED_STATUSES = ['idea', 'draft', 'planned', 'ready', 'published', 'cancelled'] as const;
export type StoredStatus = (typeof STORED_STATUSES)[number];
/** `missed` is derived (a dated plan whose time passed without being published), never stored. */
export type PlanStatus = StoredStatus | 'missed';

/** How long after its time a plan still counts as "due now" rather than missed. */
export const MISSED_GRACE_MS = 60 * 60_000;

/** Allowed status changes. Dated statuses (planned, ready) also need a date, checked separately. */
export const TRANSITIONS: Record<StoredStatus, readonly StoredStatus[]> = {
  idea: ['draft', 'planned', 'cancelled'],
  draft: ['idea', 'planned', 'ready', 'published', 'cancelled'],
  planned: ['idea', 'draft', 'ready', 'published', 'cancelled'],
  ready: ['idea', 'draft', 'planned', 'published', 'cancelled'],
  // Undo a mistaken "published".
  published: ['ready'],
  cancelled: ['idea', 'draft', 'planned'],
};
export const NEEDS_DATE: readonly StoredStatus[] = ['planned', 'ready'];

export function canTransition(from: StoredStatus, to: StoredStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

/** Legacy rows stored "scheduled"; Media Navigator never schedules on a platform, so that meant "planned". */
export function normaliseStoredStatus(s: string | undefined): StoredStatus {
  if (s === 'scheduled') return 'planned';
  return (STORED_STATUSES as readonly string[]).includes(s ?? '') ? (s as StoredStatus) : 'planned';
}

export function effectiveStatus(stored: StoredStatus, scheduledAt: Date | null | undefined, now = new Date()): PlanStatus {
  if ((stored === 'planned' || stored === 'ready' || stored === 'draft') && scheduledAt && now.getTime() - scheduledAt.getTime() > MISSED_GRACE_MS) return 'missed';
  return stored;
}

/** Reminder offsets in minutes before the planned time. 0 = at the planned time. */
export const REMINDER_OFFSETS = [0, 15, 30, 60, 1440] as const;
export type ReminderOffset = (typeof REMINDER_OFFSETS)[number];

/** A reminder is never sent once it is this late. */
export const REMINDER_STALE_MS = 30 * 60_000;

export const reminderKey = (planId: string, offset: number, scheduledAt: Date) => `plan_reminder:${planId}:${offset}:${scheduledAt.getTime()}`;

/**
 * Reminders that should fire now. Keys include the planned instant, so rescheduling makes fresh reminders and
 * the old ones can never fire. A reminder that would arrive after the post time (or very late) is skipped.
 */
export function dueReminders(plan: { id: string; status: StoredStatus; scheduledAt: Date | null; reminders: number[] }, now = new Date()): Array<{ offset: number; key: string }> {
  if (!plan.scheduledAt || !(plan.status === 'planned' || plan.status === 'ready')) return [];
  const at = plan.scheduledAt.getTime();
  const t = now.getTime();
  return [...new Set(plan.reminders)]
    .filter((offset) => {
      const fireAt = at - offset * 60_000;
      if (fireAt > t) return false;
      if (t - fireAt > REMINDER_STALE_MS) return false;
      // A "before" reminder after the post time is outdated.
      return offset === 0 || t < at;
    })
    .map((offset) => ({ offset, key: reminderKey(plan.id, offset, plan.scheduledAt!) }));
}

export function describeOffset(offset: number): string {
  if (offset === 0) return 'now';
  if (offset === 1440) return 'in 1 day';
  if (offset >= 60) return `in ${offset / 60} hour${offset === 60 ? '' : 's'}`;
  return `in ${offset} minutes`;
}

const VIDEO = ['Video ready', 'Opening reviewed', 'Caption prepared', 'Cover selected', 'CTA checked', 'Final review complete'];
const VISUAL = ['Visuals ready', 'Slide order reviewed', 'Caption prepared', 'CTA checked', 'Final review complete'];
const SINGLE_IMAGE = ['Visuals ready', 'Caption prepared', 'CTA checked', 'Final review complete'];
const TEXT = ['Opening reviewed', 'Content proofread', 'Links checked', 'CTA checked', 'Final review complete'];

/** Format-specific preparation checklist the user can then edit. */
export function defaultChecklist(format: PlanFormat): string[] {
  switch (format) {
    case 'reel': case 'short': case 'video': case 'story': return VIDEO;
    case 'carousel': case 'document': return VISUAL;
    case 'image': return SINGLE_IMAGE;
    case 'text': return TEXT;
  }
}
