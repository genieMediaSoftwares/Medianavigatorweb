import { logger } from '../../lib/logger.js';
import { to12h } from '../../lib/zonedTime.js';
import { Notification } from '../../models/Notification.js';
import { plannedRepository } from '../../repositories/planned.repository.js';
import { describeOffset, dueReminders, normaliseStoredStatus, REMINDER_STALE_MS } from '../../services/planner/plans.js';

const PLATFORM_NAME: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', linkedin: 'LinkedIn' };

/**
 * Delivers due plan reminders as in-app notifications. Safe to run on several instances at once: the notification's
 * unique (userId, dedupeKey) index lets exactly one insert win, and keys include the planned time, so a rescheduled
 * plan gets new reminders while the old ones can never fire.
 */
export async function sendDueReminders(now = new Date()): Promise<number> {
  // Widest window: a 1-day reminder for a plan up to a day away, and an "at time" reminder up to the stale limit ago.
  const plans = await plannedRepository.withRemindersBetween(new Date(now.getTime() - REMINDER_STALE_MS), new Date(now.getTime() + 86_400_000 + REMINDER_STALE_MS), 2000);
  let sent = 0;
  for (const p of plans) {
    const due = dueReminders({ id: String(p._id), status: normaliseStoredStatus(p.status), scheduledAt: p.scheduledAt ?? null, reminders: p.reminders ?? [] }, now);
    for (const { offset, key } of due) {
      const when = p.localDate && p.localTime ? `${p.localDate} at ${to12h(p.localTime)}${p.timezone ? ` (${p.timezone})` : ''}` : '';
      const res = await Notification.updateOne(
        { userId: p.userId, dedupeKey: key },
        {
          $setOnInsert: {
            userId: p.userId, dedupeKey: key, type: 'plan_reminder', severity: 'info', readAt: null,
            title: offset === 0 ? `Time to post: ${p.title}` : `Coming up ${describeOffset(offset)}: ${p.title}`,
            body: `${PLATFORM_NAME[p.platform] ?? p.platform}${p.format ? ` ${p.format}` : ''}${when ? `, planned for ${when}` : ''}. Media Navigator doesn’t post for you: publish it on ${PLATFORM_NAME[p.platform] ?? p.platform}, then mark it published.`,
            data: { planId: String(p._id), offset, scheduledAt: p.scheduledAt?.toISOString() },
          },
        },
        { upsert: true },
      );
      if (res.upsertedCount) sent++;
      await plannedRepository.markReminderSent(p._id, key);
    }
  }
  if (sent) logger.info('plan reminders sent', { operation: 'planner_reminders', sent });
  return sent;
}
