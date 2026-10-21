import type { Types, AnyBulkWriteOperation } from 'mongoose';
import { ContentItem, type ContentItemDoc } from '../models/ContentItem.js';
import { config } from '../config/env.js';
import { toObjectId, isObjectId } from '../lib/ids.js';

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

  /** Posts of the given accounts published since `from`, with the fields the planner needs. */
  listForPlanner: (userId: Types.ObjectId, accountIds: Types.ObjectId[], from: Date) =>
    ContentItem.find({ userId, connectedAccountId: { $in: accountIds }, publishedAt: { $gte: from } })
      .sort({ publishedAt: -1 })
      .limit(config.database.analyticsMaxItems)
      .select('connectedAccountId platform contentType publishedAt engagementRate views reach unavailableMetrics')
      .lean<Pick<ContentItemDoc, 'connectedAccountId' | 'platform' | 'contentType' | 'publishedAt' | 'engagementRate' | 'views' | 'reach' | 'unavailableMetrics'>[]>(),

  findByLegacyId: (userId: Types.ObjectId, legacyId: string) =>
    ContentItem.findOne({ userId, legacyId }).lean<ContentItemDoc>(),
  /** Accepts either the provider (legacy) id or the document id, so every client id resolves. */
  findByIdOrLegacy: (userId: Types.ObjectId, id: string) => {
    const filter: Record<string, unknown> = { userId };
    if (isObjectId(id)) filter.$or = [{ _id: toObjectId(id) }, { legacyId: id }];
    else filter.legacyId = id;
    return ContentItem.findOne(filter).lean<ContentItemDoc>();
  },

  async page(userId: Types.ObjectId, accountIds: Types.ObjectId[], params: { limit: number; cursor?: { t: number; id: string }; platform?: string }) {
    const filter: Record<string, unknown> = {
      $or: [
        { userId },
        { userId: String(userId) },
      ],
    };
    if (accountIds && accountIds.length > 0) {
      const allAccs = [...accountIds, ...accountIds.map((a) => String(a))];
      (filter as any).connectedAccountId = { $in: allAccs };
    }
    if (params.platform) filter.platform = params.platform;
    if (params.cursor) {
      const cDate = new Date(params.cursor.t);
      const cId = isObjectId(params.cursor.id) ? toObjectId(params.cursor.id) : params.cursor.id;
      filter.$and = [
        {
          $or: [
            { publishedAt: { $lt: cDate } },
            { publishedAt: cDate, _id: { $lt: cId } },
          ],
        },
      ];
    }
    return ContentItem.find(filter).sort({ publishedAt: -1, _id: -1 }).limit(params.limit + 1).lean<ContentItemDoc[]>();
  },

  countForFeed: (userId: Types.ObjectId, accountIds: Types.ObjectId[], platform?: string) =>
    ContentItem.countDocuments({
      $or: [{ userId }, { userId: String(userId) }],
      connectedAccountId: { $in: [...accountIds, ...accountIds.map((a) => String(a))] },
      ...(platform ? { platform } : {}),
    } as any),

  countForAccount: (connectedAccountId: Types.ObjectId) => ContentItem.countDocuments({ connectedAccountId }),
  /** Removes all synced media for one connection (used when the connected channel changes, so old content never mixes in). */
  deleteForAccount: (connectedAccountId: Types.ObjectId) => ContentItem.deleteMany({ connectedAccountId }),

  /** Removes this account's items whose provider ID is not in `keep`, returning their legacy IDs. */
  async deleteMissing(connectedAccountId: Types.ObjectId, keep: string[]): Promise<string[]> {
    const gone = await ContentItem.find({ connectedAccountId, providerMediaId: { $nin: keep } }).select('legacyId').lean<Array<{ _id: Types.ObjectId; legacyId: string }>>();
    if (gone.length) await ContentItem.deleteMany({ _id: { $in: gone.map((g) => g._id) } });
    return gone.map((g) => g.legacyId);
  },
  latestPublishedAt: async (connectedAccountId: Types.ObjectId) =>
    (await ContentItem.findOne({ connectedAccountId }).sort({ publishedAt: -1 }).select('publishedAt').lean<{ publishedAt: Date }>())?.publishedAt ?? null,
  existingIds: async (connectedAccountId: Types.ObjectId): Promise<Set<string>> =>
    new Set((await ContentItem.find({ connectedAccountId }).select('providerMediaId').lean<{ providerMediaId: string }[]>()).map((r) => r.providerMediaId)),
  deleteAllForUser: (userId: Types.ObjectId) => ContentItem.deleteMany({ userId }),
  total: () => ContentItem.estimatedDocumentCount(),
};
