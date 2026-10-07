import type { Types } from 'mongoose';
import { Analytics, type AnalyticsDoc } from '../models/Analytics.js';

export const analyticsRepository = {
  upsertDaily: (doc: Omit<AnalyticsDoc, '_id' | 'createdAt' | 'updatedAt'>) =>
    Analytics.updateOne({ connectedAccountId: doc.connectedAccountId, date: doc.date }, { $set: doc }, { upsert: true }),

  history: (userId: Types.ObjectId, params: { from?: string; to?: string; platform?: string; limit: number }) => {
    const filter: Record<string, unknown> = { userId };
    if (params.platform) filter.platform = params.platform;
    if (params.from || params.to) filter.date = { ...(params.from ? { $gte: params.from } : {}), ...(params.to ? { $lte: params.to } : {}) };
    return Analytics.find(filter).sort({ date: -1 }).limit(params.limit).lean<AnalyticsDoc[]>();
  },
  deleteAllForUser: (userId: Types.ObjectId) => Analytics.deleteMany({ userId }),
};
