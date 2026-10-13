import type { Types } from 'mongoose';
import type { AlertItem } from '../../../shared/types.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import type { NotificationDoc } from '../models/Notification.js';
import { loadAnalyticsContext } from './analytics.service.js';
import { toObjectId } from '../lib/ids.js';
import { notFound } from '../lib/errors.js';
import { profileRepository } from '../repositories/profile.repository.js';
import type { NOTIFICATION_CATEGORIES, NotificationPrefs } from '../models/Profile.js';

type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const notificationView = (n: NotificationDoc) => ({
  id: String(n._id), type: n.type, severity: n.severity, title: n.title, body: n.body, data: n.data ?? null, read: Boolean(n.readAt), readAt: n.readAt ?? null, createdAt: n.createdAt,
});

export const alertView = (n: NotificationDoc): AlertItem => ({
  id: String(n._id),
  type: ((n.data as any)?.alertType ?? 'Engagement change') as AlertItem['type'],
  icon: ((n.data as any)?.icon ?? '🔔') as string,
  title: n.title,
  description: n.body,
  severity: n.severity === 'medium' || n.severity === 'high' ? n.severity : 'info',
  timestamp: n.createdAt.toISOString(),
  investigationNotes: ((n.data as any)?.investigationNotes ?? '') as string,
  read: Boolean(n.readAt),
});

/** Notification type → the preference category that controls it. Unlisted types are always delivered. */
const CATEGORY: Record<string, NotificationCategory> = {
  sync_completed: 'syncUpdates',
  sync_failed: 'connectionProblems',
  connection_expired: 'connectionProblems',
  sync_permission_required: 'connectionProblems',
};
const categoryOf = (type: string): NotificationCategory | undefined => CATEGORY[type];

async function prefsOf(userId: Types.ObjectId): Promise<NotificationPrefs> {
  const p = (await profileRepository.findByUserId(userId))?.notificationPrefs;
  return { syncUpdates: p?.syncUpdates ?? true, connectionProblems: p?.connectionProblems ?? true, performanceAlerts: p?.performanceAlerts ?? true };
}
const wants = async (userId: Types.ObjectId, category: NotificationCategory) => (await prefsOf(userId))[category];

export const notificationService = {
  /** Creates a notification unless the user turned its category off. Returns null when skipped. */
  async notify(userId: Types.ObjectId, type: string, title: string, body: string, severity: 'info' | 'medium' | 'high' = 'info', data?: Record<string, unknown>) {
    const category = categoryOf(type);
    if (category && !(await wants(userId, category))) return null;
    return notificationRepository.create({ userId, type, title, body, severity, data });
  },

  async page(userId: string, q: { limit: number; cursor?: { t: number; id: string }; unreadOnly?: boolean }) {
    const rows = await notificationRepository.page(toObjectId(userId), { ...q, limit: q.limit });
    const hasMore = rows.length > q.limit;
    return { items: rows.slice(0, q.limit).map(notificationView), hasMore, last: rows[Math.min(rows.length, q.limit) - 1] };
  },

  async markRead(userId: string, id: string) {
    const n = await notificationRepository.markRead(toObjectId(userId), id);
    if (!n) throw notFound('Notification not found');
    return notificationView(n);
  },
  markAllRead: (userId: string) => notificationRepository.markAllRead(toObjectId(userId)),
  unreadCount: (userId: string) => notificationRepository.unreadCount(toObjectId(userId)),

  /** Alerts are derived from connection health and measured performance; they are never invented. */
  async refreshAlerts(userId: Types.ObjectId) {
    // Categories the user turned off are simply not kept, so pruning below also clears their old alerts.
    const prefs = await prefsOf(userId);
    const { connections, media } = await loadAnalyticsContext(userId);
    const keep: string[] = [];
    const put = async (key: string, data: { title: string; body: string; severity: 'info' | 'medium' | 'high'; type: string; extra: Record<string, unknown> }) => {
      keep.push(key);
      await notificationRepository.upsertByKey(userId, key, { type: 'alert', title: data.title, body: data.body, severity: data.severity, data: { alertType: data.type, ...data.extra } });
    };

    for (const c of prefs.connectionProblems ? connections : []) {
      if (c.status === 'connection_expired') {
        await put(`conn_expired_${c.platform}`, { title: `${c.name} connection expired`, body: `Your ${c.name} access has expired. Reconnect to resume syncing.`, severity: 'high', type: 'Engagement change', extra: { icon: '⚠️', investigationNotes: 'Provider access tokens expire or are revoked and must be renewed by reconnecting.' } });
      }
      if (c.status === 'permission_required') {
        await put(`conn_perm_${c.platform}`, { title: `${c.name} needs additional permissions`, body: c.statusMessage || 'Additional permissions are needed.', severity: 'medium', type: 'Engagement change', extra: { icon: '🔒', investigationNotes: 'Grant the missing permissions when reconnecting.' } });
      }
    }
    const live = media.filter((m) => connections.find((c) => c.platform === m.platform)?.connected);
    if (prefs.performanceAlerts && live.length >= 5) {
      const sorted = [...live].map((m) => m.engagementRate).sort((a, b) => a - b);
      const med = sorted[Math.floor(sorted.length / 2)];
      const spike = live.filter((m) => m.engagementRate > med * 2 && m.engagementRate > 3).sort((a, b) => b.engagementRate - a.engagementRate)[0];
      if (spike) {
        await put(`spike_${spike.id}`, {
          title: `Performance spike: ${spike.title.slice(0, 80)}`,
          body: `Engagement rate ${spike.engagementRate}% is more than 2x your median of ${med.toFixed(2)}%.`,
          severity: 'high', type: 'Performance spike',
          extra: { icon: '🚀', investigationNotes: `${spike.likes} likes and ${spike.comments} comments on ${spike.platform}.`, mediaId: spike.id },
        });
      }
    }
    await notificationRepository.pruneDerived(userId, 'alert', keep);
  },

  async alerts(userId: string) {
    const rows = await notificationRepository.page(toObjectId(userId), { limit: 100, type: 'alert' });
    return rows.slice(0, 100).map(alertView);
  },
};
