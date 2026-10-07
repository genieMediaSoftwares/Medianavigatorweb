import type { Types, AnyBulkWriteOperation } from 'mongoose';
import { ContentItem, type ContentItemDoc } from '../models/ContentItem.js';
import { config } from '../config/env.js';
import { toObjectId } from '../lib/ids.js';

export interface UpsertResult { created: number; updated: number }

export const mediaRepository = {
  /** Idempotent: identity is (connectedAccountId, providerMediaId). Re-fetching the same item updates it. */
  async bulkUpsert(items: Array<Omit<ContentItemDoc, '_id' | 'createdAt' | 'updatedAt'>>): Promise<UpsertResult> {
    if (items.length === 0) return { created: 0, updated: 0 };
    const ops: AnyBulkWriteOperation<ContentItemDoc>[] = items.map((item) => ({
      updateOne: {
        filter: { connectedAccountId: item.connectedAccountId, providerMediaId: item.providerMediaId },
        update: { $set: item },
        upsert: true,
      },
    }));
    const res = await ContentItem.bulkWrite(ops, { ordered: false });
    return { created: res.upsertedCount, updated: res.matchedCount };
  },

  /** Live media for the analytics engine: only active connections' content, bounded by configuration. */
  listForAnalytics: (userId: Types.ObjectId, accountIds: Types.ObjectId[]) =>
    ContentItem.find({ userId, connectedAccountId: { $in: accountIds } })
      .sort({ publishedAt: -1 })
      .limit(config.database.analyticsMaxItems)
      .select('normalized legacyId platform contentType publishedAt engagementRate views likes comments unavailableMetrics syncedAt')
      .lean<ContentItemDoc[]>(),

  findByLegacyId: (userId: Types.ObjectId, legacyId: string) =>
    ContentItem.findOne({ userId, legacyId }).lean<ContentItemDoc>(),

  async page(userId: Types.ObjectId, accountIds: Types.ObjectId[], params: { limit: number; cursor?: { t: number; id: string }; platform?: string }) {
    const filter: Record<string, unknown> = { userId, connectedAccountId: { $in: accountIds } };
    if (params.platform) filter.platform = params.platform;
    if (params.cursor) {
      filter.$or = [
        { publishedAt: { $lt: new Date(params.cursor.t) } },
        { publishedAt: new Date(params.cursor.t), _id: { $lt: toObjectId(params.cursor.id) } },
      ];
    }
    return ContentItem.find(filter).sort({ publishedAt: -1, _id: -1 }).limit(params.limit + 1).lean<ContentItemDoc[]>();
  },

  countForAccount: (connectedAccountId: Types.ObjectId) => ContentItem.countDocuments({ connectedAccountId }),
  latestPublishedAt: async (connectedAccountId: Types.ObjectId) =>
    (await ContentItem.findOne({ connectedAccountId }).sort({ publishedAt: -1 }).select('publishedAt').lean<{ publishedAt: Date }>())?.publishedAt ?? null,
  existingIds: async (connectedAccountId: Types.ObjectId): Promise<Set<string>> =>
    new Set((await ContentItem.find({ connectedAccountId }).select('providerMediaId').lean<{ providerMediaId: string }[]>()).map((r) => r.providerMediaId)),
  deleteAllForUser: (userId: Types.ObjectId) => ContentItem.deleteMany({ userId }),
  total: () => ContentItem.estimatedDocumentCount(),
};
