import { describe, expect, it } from 'vitest';

import { actionsFor, canTransition, countByDate, defaultChecklist, filterPlans, groupPlans, readiness, sortPlans } from '@/features/planner/planRules';
import { desiredDeviceReminders, reconcile } from '@/features/planner/reminderSchedule';
import type { Plan } from '@/types/api';

const plan = (over: Partial<Plan>): Plan => ({
  id: 'p', title: 'Plan', platform: 'instagram', format: 'reel', contentType: 'reel', status: 'planned', storedStatus: 'planned', needsDate: false,
  scheduledAt: '2026-10-20T12:00:00.000Z', timezone: 'UTC', localDate: '2026-10-20', localTime: '12:00', legacy: null,
  description: '', caption: '', cta: '', referenceUrl: '', notes: '', goal: null, checklist: [], checklistDone: 0, reminders: [], remindersSentCount: 0,
  groupId: null, source: null, publication: null, isRecommended: false, recommendationReason: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

describe('plan lifecycle', () => {
  it('mirrors the server’s allowed transitions', () => {
    expect(canTransition('planned', 'ready')).toBe(true);
    expect(canTransition('idea', 'published')).toBe(false);
    expect(canTransition('published', 'cancelled')).toBe(false);
  });

  it('offers only actions that make sense for the status', () => {
    expect(actionsFor(plan({}))).toEqual(['edit', 'reschedule', 'markReady', 'markPublished', 'toIdeas', 'cancel', 'delete']);
    expect(actionsFor(plan({ storedStatus: 'ready', status: 'ready' }))).not.toContain('markReady');
    expect(actionsFor(plan({ storedStatus: 'idea', status: 'idea', scheduledAt: null, localDate: null }))).toEqual(['edit', 'pickDate', 'toDraft', 'cancel', 'delete']);
    expect(actionsFor(plan({ needsDate: true, scheduledAt: null, localDate: null }))).toContain('pickDate');
    expect(actionsFor(plan({ needsDate: true, scheduledAt: null, localDate: null }))).not.toContain('markPublished');
    expect(actionsFor(plan({ storedStatus: 'published', status: 'published' }))).toEqual(['undoPublish', 'edit', 'delete']);
    expect(actionsFor(plan({ storedStatus: 'cancelled', status: 'cancelled' }))).toEqual(['restore', 'delete']);
    // A missed plan can be rescheduled or marked published.
    expect(actionsFor(plan({ status: 'missed' }))).toEqual(expect.arrayContaining(['reschedule', 'markPublished']));
  });

  it('reports readiness without treating a checklist as “ready”', () => {
    expect(readiness(plan({ checklist: [{ id: 'a', label: 'A', done: true }, { id: 'b', label: 'B', done: false }], checklistDone: 1 }))).toMatchObject({ label: '1 of 2 done', complete: false });
    expect(readiness(plan({ checklist: [], checklistDone: 0 }))).toMatchObject({ complete: false, label: 'No checklist' });
    expect(defaultChecklist('short')).toHaveLength(6);
  });
});

describe('sorting, filtering and sections', () => {
  const later = plan({ id: 'later', scheduledAt: '2026-10-22T09:00:00.000Z', localDate: '2026-10-22' });
  const sooner = plan({ id: 'sooner', scheduledAt: '2026-10-20T18:00:00.000Z', localDate: '2026-10-20', platform: 'linkedin' });
  const idea = plan({ id: 'idea', storedStatus: 'idea', status: 'idea', scheduledAt: null, localDate: null });
  const missed = plan({ id: 'missed', status: 'missed', scheduledAt: '2026-10-10T09:00:00.000Z', localDate: '2026-10-10' });
  const legacy = plan({ id: 'legacy', needsDate: true, scheduledAt: null, localDate: null, legacy: { day: 'Monday', time: '1:00 PM' } });
  const done = plan({ id: 'done', storedStatus: 'published', status: 'published' });
  const cancelled = plan({ id: 'cancelled', storedStatus: 'cancelled', status: 'cancelled', localDate: '2026-10-22' });

  it('sorts by the real planned instant, earliest first (audit #6)', () => {
    // Created in the opposite order on purpose.
    expect(sortPlans([idea, later, sooner]).map((p) => p.id)).toEqual(['sooner', 'later', 'idea']);
  });

  it('groups plans into attention, upcoming, ideas and done', () => {
    const g = groupPlans([later, idea, missed, legacy, done, sooner, cancelled]);
    expect(g.attention.map((p) => p.id)).toEqual(['missed', 'legacy']);
    expect(g.upcoming.map((p) => p.id)).toEqual(['sooner', 'later']);
    expect(g.ideas.map((p) => p.id)).toEqual(['idea']);
    expect(g.done.map((p) => p.id).sort()).toEqual(['cancelled', 'done']);
  });

  it('filters by platform and counts calendar dots without cancelled plans', () => {
    expect(filterPlans([later, sooner], 'linkedin').map((p) => p.id)).toEqual(['sooner']);
    expect(filterPlans([later, sooner], 'all')).toHaveLength(2);
    const counts = countByDate([later, cancelled, missed]);
    expect(counts.get('2026-10-22')).toEqual({ total: 1, missed: 0, published: 0 });
    expect(counts.get('2026-10-10')).toEqual({ total: 1, missed: 1, published: 0 });
  });
});

describe('device reminders', () => {
  const now = new Date('2026-10-20T10:00:00.000Z');
  const p = plan({ id: 'r1', reminders: [60, 15, 15], scheduledAt: '2026-10-20T11:00:00.000Z' });

  it('schedules one notification per future offset, with stable identifiers', () => {
    const d = desiredDeviceReminders([p], now);
    expect(d.map((r) => r.fireAt.toISOString())).toEqual(['2026-10-20T10:45:00.000Z']); // the 60-min one is already past
    expect(desiredDeviceReminders([p], now)[0].identifier).toBe(d[0].identifier);
  });

  it('skips cancelled, published, undated and idea plans', () => {
    for (const over of [{ storedStatus: 'cancelled' as const }, { storedStatus: 'published' as const }, { scheduledAt: null }, { storedStatus: 'idea' as const }]) {
      expect(desiredDeviceReminders([{ ...p, ...over }], now)).toEqual([]);
    }
  });

  it('re-arms after a reschedule, cancels what is no longer wanted, and leaves other notifications alone', () => {
    const before = desiredDeviceReminders([p], now).map((r) => r.identifier);
    const moved = desiredDeviceReminders([{ ...p, scheduledAt: '2026-10-20T12:00:00.000Z' }], now);
    const { cancel, schedule } = reconcile([...before, 'other-app-notification'], moved);
    expect(cancel).toEqual(before);
    expect(schedule.map((r) => r.identifier)).toEqual(moved.map((r) => r.identifier));
    // Already scheduled → nothing to do (no duplicates).
    expect(reconcile(moved.map((r) => r.identifier), moved)).toEqual({ cancel: [], schedule: [] });
    // A deleted plan: only its own reminders are cancelled.
    expect(reconcile([...before, 'plan:other:15:1'], [], new Set(['r1'])).cancel).toEqual(before);
  });
});
