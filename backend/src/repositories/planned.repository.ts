import type { Types } from 'mongoose';
import { PlannedContentModel, type PlannedContentDoc } from '../models/PlannedContent.js';
import { toObjectId } from '../lib/ids.js';

type NewPlan = Omit<PlannedContentDoc, '_id' | 'userId' | 'createdAt' | 'updatedAt'>;

export const plannedRepository = {
  /** Legacy list (web planner): plans that have a weekday and time, earliest planned first. */
  list: (userId: Types.ObjectId, limit: number) =>
    PlannedContentModel.find({ userId, day: { $type: 'string' }, time: { $type: 'string' } }).sort({ scheduledAt: 1, createdAt: -1 }).limit(limit).lean<PlannedContentDoc[]>(),
  /** Dated plans planned within [from, to), earliest first. */
  listRange: (userId: Types.ObjectId, from: Date, to: Date, limit: number) =>
    PlannedContentModel.find({ userId, scheduledAt: { $gte: from, $lt: to } }).sort({ scheduledAt: 1, _id: 1 }).limit(limit).lean<PlannedContentDoc[]>(),
  /** Plans without a date: ideas, drafts and legacy weekday-only plans, newest first. */
  listUndated: (userId: Types.ObjectId, limit: number) =>
    PlannedContentModel.find({ userId, scheduledAt: null }).sort({ createdAt: -1, _id: -1 }).limit(limit).lean<PlannedContentDoc[]>(),
  findById: (userId: Types.ObjectId, id: string) =>
    PlannedContentModel.findOne({ _id: toObjectId(id, 'planner id'), userId }).lean<PlannedContentDoc>(),
  listGroup: (userId: Types.ObjectId, groupId: string) =>
    PlannedContentModel.find({ userId, groupId }).sort({ scheduledAt: 1, _id: 1 }).lean<PlannedContentDoc[]>(),
  findByPublishedMedia: (userId: Types.ObjectId, mediaIds: string[]) =>
    PlannedContentModel.find({ userId, 'publication.mediaId': { $in: mediaIds } }).select('_id publication.mediaId').lean<Pick<PlannedContentDoc, '_id' | 'publication'>[]>(),
  create: async (userId: Types.ObjectId, data: NewPlan) =>
    (await PlannedContentModel.create({ ...data, userId })).toObject() as PlannedContentDoc,
  createMany: async (userId: Types.ObjectId, rows: NewPlan[]) =>
    (await PlannedContentModel.insertMany(rows.map((r) => ({ ...r, userId })))).map((d) => d.toObject() as PlannedContentDoc),
  update: (userId: Types.ObjectId, id: string, set: Partial<NewPlan>, unset: string[] = []) =>
    PlannedContentModel.findOneAndUpdate(
      { _id: toObjectId(id, 'planner id'), userId },
      { $set: set, ...(unset.length ? { $unset: Object.fromEntries(unset.map((k) => [k, 1])) } : {}) },
      { new: true, runValidators: true },
    ).lean<PlannedContentDoc>(),
  remove: (userId: Types.ObjectId, id: string) => PlannedContentModel.deleteOne({ _id: toObjectId(id, 'planner id'), userId }),
  deleteAllForUser: (userId: Types.ObjectId) => PlannedContentModel.deleteMany({ userId }),

  /** Upcoming dated plans with reminders, for the reminder job (all users). */
  withRemindersBetween: (from: Date, to: Date, limit: number) =>
    PlannedContentModel.find({ status: { $in: ['planned', 'ready'] }, scheduledAt: { $gte: from, $lte: to }, 'reminders.0': { $exists: true } })
      .sort({ scheduledAt: 1 }).limit(limit)
      .select('_id userId title platform format status scheduledAt timezone localDate localTime reminders')
      .lean<PlannedContentDoc[]>(),
  markReminderSent: (id: Types.ObjectId, key: string) => PlannedContentModel.updateOne({ _id: id }, { $addToSet: { remindersSent: key } }),
};
