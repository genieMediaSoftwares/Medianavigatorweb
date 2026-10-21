/**
 * Which device notifications should exist for a set of plans. Pure, so the lifecycle is unit-tested:
 * identifiers are deterministic (`plan:<id>:<offset>`), so scheduling twice replaces instead of duplicating, and
 * anything not in the desired set (deleted, cancelled, published, rescheduled-away) is cancelled.
 */
import type { Plan } from '@/types/api';

import { FORMAT_LABEL } from './planRules';

export const DEVICE_REMINDER_PREFIX = 'plan:';

export interface DeviceReminder {
  identifier: string;
  planId: string;
  fireAt: Date;
  title: string;
  body: string;
}

const PLATFORM_NAME = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', linkedin: 'LinkedIn' } as const;

function lead(offset: number) {
  if (offset === 0) return 'Time to post';
  if (offset === 1440) return 'Tomorrow';
  if (offset >= 60) return `In ${offset / 60} hour${offset === 60 ? '' : 's'}`;
  return `In ${offset} minutes`;
}

/** Future reminders for plans still to do. Past fire times are skipped (the OS would fire them immediately). */
export function desiredDeviceReminders(plans: Pick<Plan, 'id' | 'title' | 'platform' | 'format' | 'storedStatus' | 'scheduledAt' | 'reminders'>[], now = new Date()): DeviceReminder[] {
  const out: DeviceReminder[] = [];
  for (const p of plans) {
    if (!p.scheduledAt || !(p.storedStatus === 'planned' || p.storedStatus === 'ready')) continue;
    const at = new Date(p.scheduledAt).getTime();
    for (const offset of new Set(p.reminders)) {
      const fireAt = new Date(at - offset * 60_000);
      if (fireAt.getTime() <= now.getTime()) continue;
      out.push({
        identifier: `${DEVICE_REMINDER_PREFIX}${p.id}:${offset}:${at}`,
        planId: p.id,
        fireAt,
        title: `${lead(offset)}: ${p.title}`,
        body: `${PLATFORM_NAME[p.platform]}${p.format ? ` ${FORMAT_LABEL[p.format].toLowerCase()}` : ''}. Publish it on ${PLATFORM_NAME[p.platform]}, then mark it published in Media Navigator.`,
      });
    }
  }
  return out;
}

/** What to cancel and what to schedule, given what the device already has. Unrelated notifications are left alone. */
export function reconcile(existing: string[], desired: DeviceReminder[], managedPlanIds?: Set<string>) {
  const want = new Map(desired.map((d) => [d.identifier, d]));
  const ours = existing.filter((id) => id.startsWith(DEVICE_REMINDER_PREFIX));
  // When only some plans were loaded, only reconcile reminders of those plans.
  const inScope = (id: string) => !managedPlanIds || managedPlanIds.has(id.slice(DEVICE_REMINDER_PREFIX.length).split(':')[0]);
  const cancel = ours.filter((id) => inScope(id) && !want.has(id));
  const have = new Set(ours);
  const schedule = desired.filter((d) => !have.has(d.identifier));
  return { cancel, schedule };
}
