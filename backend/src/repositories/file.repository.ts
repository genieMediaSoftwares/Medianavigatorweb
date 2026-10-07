import type { Types } from 'mongoose';
import { FileModel, type FileDoc } from '../models/File.js';
import { toObjectId } from '../lib/ids.js';

export const fileRepository = {
  create: async (data: Omit<FileDoc, '_id' | 'createdAt' | 'updatedAt' | 'status'>) => (await FileModel.create(data)).toObject() as FileDoc,
  /** Ownership is part of every lookup. */
  findOwned: (userId: Types.ObjectId, id: string) => FileModel.findOne({ _id: toObjectId(id, 'file id'), userId, status: 'ready' }).lean<FileDoc>(),
  async page(userId: Types.ObjectId, params: { limit: number; cursor?: { t: number; id: string } }) {
    const filter: Record<string, unknown> = { userId, status: 'ready' };
    if (params.cursor) {
      filter.$or = [
        { createdAt: { $lt: new Date(params.cursor.t) } },
        { createdAt: new Date(params.cursor.t), _id: { $lt: toObjectId(params.cursor.id) } },
      ];
    }
    return FileModel.find(filter).sort({ createdAt: -1, _id: -1 }).limit(params.limit + 1).lean<FileDoc[]>();
  },
  markDeleted: (userId: Types.ObjectId, id: Types.ObjectId) => FileModel.updateOne({ _id: id, userId }, { $set: { status: 'deleted' } }),
  listAllKeysForUser: (userId: Types.ObjectId) => FileModel.find({ userId, status: 'ready' }).select('key').lean<{ _id: Types.ObjectId; key: string }[]>(),
  deleteAllForUser: (userId: Types.ObjectId) => FileModel.deleteMany({ userId }),
  stats: () => FileModel.aggregate<{ _id: null; count: number; bytes: number }>([{ $match: { status: 'ready' } }, { $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: '$size' } } }]),
};
