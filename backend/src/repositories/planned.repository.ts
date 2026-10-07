import type { Types } from 'mongoose';
import { PlannedContentModel, type PlannedContentDoc } from '../models/PlannedContent.js';
import { toObjectId } from '../lib/ids.js';

export const plannedRepository = {
  list: (userId: Types.ObjectId, limit: number) => PlannedContentModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean<PlannedContentDoc[]>(),
  create: async (userId: Types.ObjectId, data: Omit<PlannedContentDoc, '_id' | 'userId' | 'createdAt'>) =>
    (await PlannedContentModel.create({ ...data, userId })).toObject() as PlannedContentDoc,
  remove: (userId: Types.ObjectId, id: string) => PlannedContentModel.deleteOne({ _id: toObjectId(id, 'planner id'), userId }),
  deleteAllForUser: (userId: Types.ObjectId) => PlannedContentModel.deleteMany({ userId }),
};
