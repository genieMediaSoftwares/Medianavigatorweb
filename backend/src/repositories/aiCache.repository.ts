import type { Types } from 'mongoose';
import { AiCache, type AiCacheDoc } from '../models/AiCache.js';

export const aiCacheRepository = {
  get: (userId: Types.ObjectId, cacheKey: string) => AiCache.findOne({ userId, cacheKey, expiresAt: { $gt: new Date() } }).lean<AiCacheDoc>(),
  put: (doc: Omit<AiCacheDoc, '_id'>) => AiCache.updateOne({ userId: doc.userId, cacheKey: doc.cacheKey }, { $set: doc }, { upsert: true }),
  deleteAllForUser: (userId: Types.ObjectId) => AiCache.deleteMany({ userId }),
};
