import type { Types } from 'mongoose';
import { Notification, type NotificationDoc } from '../models/Notification.js';
import { toObjectId } from '../lib/ids.js';

export const notificationRepository = {
  create: async (data: Pick<NotificationDoc, 'userId' | 'type' | 'title' | 'body'> & Partial<NotificationDoc>) =>
    (await Notification.create(data)).toObject() as NotificationDoc,

  /** Idempotent create for derived notifications (alerts). Existing read state is preserved. */
  upsertByKey: (userId: Types.ObjectId, dedupeKey: string, data: Omit<NotificationDoc, '_id' | 'createdAt' | 'userId' | 'dedupeKey' | 'readAt'>) =>
    Notification.updateOne({ userId, dedupeKey }, { $set: data, $setOnInsert: { userId, dedupeKey, readAt: null } }, { upsert: true }),

  /** Removes derived alerts that no longer apply. */
  pruneDerived: (userId: Types.ObjectId, type: string, keepKeys: string[]) =>
    Notification.deleteMany({ userId, type, dedupeKey: { $exists: true, $nin: keepKeys } }),

  async page(userId: Types.ObjectId, params: { limit: number; cursor?: { t: number; id: string }; unreadOnly?: boolean; type?: string }) {
    const filter: Record<string, unknown> = { userId };
    if (params.unreadOnly) filter.readAt = null;
    if (params.type) filter.type = params.type;
    if (params.cursor) {
      filter.$or = [
        { createdAt: { $lt: new Date(params.cursor.t) } },
        { createdAt: new Date(params.cursor.t), _id: { $lt: toObjectId(params.cursor.id) } },
      ];
    }
    return Notification.find(filter).sort({ createdAt: -1, _id: -1 }).limit(params.limit + 1).lean<NotificationDoc[]>();
  },
  markRead: (userId: Types.ObjectId, id: string) =>
    Notification.findOneAndUpdate({ _id: toObjectId(id, 'notification id'), userId }, { $set: { readAt: new Date() } }, { new: true }).lean<NotificationDoc>(),
  markAllRead: (userId: Types.ObjectId) => Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } }),
  unreadCount: (userId: Types.ObjectId) => Notification.countDocuments({ userId, readAt: null }),
  deleteAllForUser: (userId: Types.ObjectId) => Notification.deleteMany({ userId }),
};
