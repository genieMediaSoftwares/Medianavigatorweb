import { useRouter } from 'expo-router';
import { useState } from 'react';

import { confirmDestructive, showMessage } from '@/lib/confirm';
import type { Plan } from '@/types/api';

import { removePlan, setPlanStatus, updatePlan } from './api';
import { nextDateOn, parseTime, todayIn, type LocalDate, type LocalTime } from './dates';
import { cancelDeviceReminders, refreshDeviceReminders } from './deviceReminders';
import type { PlanAction } from './planRules';
import { ScheduleSheet } from './components/ScheduleSheet';

/**
 * Status changes, rescheduling and deletion for a plan, shared by the planner list and the plan screen. Every change
 * goes to the server (which validates it); device reminders are re-synced afterwards.
 */
export function usePlanActions({ timezone, onChanged }: { timezone: string; onChanged: (plan: Plan | null) => void }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<Plan | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const call = async (plan: Plan, fn: () => Promise<Plan | null>) => {
    setBusyId(plan.id);
    try {
      const updated = await fn();
      onChanged(updated);
      void refreshDeviceReminders();
      return true;
    } catch (e) {
      showMessage('That didn’t work', e instanceof Error ? e.message : 'Please try again.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const run = async (plan: Plan, action: PlanAction) => {
    switch (action) {
      case 'edit':
        return router.push({ pathname: '/planner/edit/[id]', params: { id: plan.id } });
      case 'markPublished':
        return router.push({ pathname: '/planner/[id]', params: { id: plan.id, publish: '1' } });
      case 'reschedule':
      case 'pickDate':
        setScheduleError(null);
        return setScheduling(plan);
      case 'markReady':
        return call(plan, () => setPlanStatus(plan.id, { status: 'ready' }));
      case 'toIdeas':
        return call(plan, () => setPlanStatus(plan.id, { status: 'idea' }));
      case 'toDraft':
        return call(plan, () => setPlanStatus(plan.id, { status: 'draft' }));
      case 'restore':
        return call(plan, () => setPlanStatus(plan.id, { status: 'draft' }));
      case 'undoPublish':
        if (!(await confirmDestructive('Undo published?', 'The link to the published post is removed and the plan goes back to Ready.', 'Undo'))) return;
        return call(plan, () => setPlanStatus(plan.id, { status: 'ready' }));
      case 'cancel':
        if (!(await confirmDestructive('Cancel this plan?', 'Its reminders stop. You can restore it later.', 'Cancel plan'))) return;
        return call(plan, () => setPlanStatus(plan.id, { status: 'cancelled' }));
      case 'delete':
        if (!(await confirmDestructive('Delete this plan?', `“${plan.title}” and its reminders will be removed. This can’t be undone.`, 'Delete'))) return;
        return call(plan, async () => {
          await removePlan(plan.id);
          await cancelDeviceReminders(plan.id);
          return null;
        });
    }
  };

  /** Ideas and older plans become "planned"; dated plans just move. */
  const saveSchedule = async (date: LocalDate, time: LocalTime) => {
    const plan = scheduling;
    if (!plan) return;
    setScheduleError(null);
    setBusyId(plan.id);
    try {
      const dated = plan.storedStatus === 'idea' || plan.needsDate || !plan.scheduledAt;
      const updated = dated && plan.storedStatus !== 'draft'
        ? await setPlanStatus(plan.id, { status: 'planned', localDate: date, localTime: time, timezone: plan.timezone ?? timezone })
        : await updatePlan(plan.id, { localDate: date, localTime: time, timezone: plan.timezone ?? timezone });
      setScheduling(null);
      onChanged(updated);
      void refreshDeviceReminders();
    } catch (e) {
      setScheduleError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setBusyId(null);
    }
  };

  const today = todayIn(timezone);
  const sheet = scheduling ? (
    <ScheduleSheet
      title={scheduling.scheduledAt ? 'Reschedule' : 'Pick a date'}
      platform={scheduling.platform}
      format={scheduling.format}
      timezone={scheduling.timezone ?? timezone}
      // An older weekday-only plan starts on its next matching date, but nothing is saved until the user confirms.
      initialDate={scheduling.localDate ?? (scheduling.legacy ? nextDateOn(scheduling.legacy.day, today) : null)}
      initialTime={scheduling.localTime ?? (scheduling.legacy ? parseTime(scheduling.legacy.time) : null)}
      saving={busyId === scheduling.id}
      error={scheduleError}
      onSave={(d, t) => void saveSchedule(d, t)}
      onClose={() => setScheduling(null)}
    />
  ) : null;

  return { run, busyId, sheet };
}
