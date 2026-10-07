import { notFound, badRequest } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import { connectionRepository } from '../repositories/connection.repository.js';
import { mediaRepository } from '../repositories/media.repository.js';
import { encodeCursor, decodeCursor, clampLimit } from '../lib/pagination.js';
import { toNormalized } from '../integrations/mapper.js';
import type { ContentItemDoc } from '../models/ContentItem.js';

export const mediaService = {
  /** Cursor-paginated feed of the user's content from live accounts. Returns the legacy NormalizedMedia shape plus availability flags. */
  async page(userId: string, q: { platform?: string; limit?: number; cursor?: string }) {
    const uid = toObjectId(userId);
    const limit = clampLimit(q.limit);
    const live = (await connectionRepository.listForUser(uid)).filter((a) => a.active);
    if (live.length === 0) return { items: [], nextCursor: null, limit };
    const cur = decodeCursor<{ t: number; id: string }>(q.cursor);
    if (cur && (typeof cur.t !== 'number' || typeof cur.id !== 'string')) throw badRequest('Invalid cursor');
    const rows = await mediaRepository.page(uid, live.map((a) => a._id), { limit, cursor: cur, platform: q.platform && q.platform !== 'all' ? q.platform : undefined });
    const pageRows = rows.slice(0, limit);
    const last = pageRows[pageRows.length - 1] as ContentItemDoc | undefined;
    return {
      items: pageRows.map(toNormalized),
      nextCursor: rows.length > limit && last ? encodeCursor({ t: last.publishedAt.getTime(), id: String(last._id) }) : null,
      limit,
    };
  },

  async get(userId: string, legacyId: string) {
    const doc = await mediaRepository.findByLegacyId(toObjectId(userId), legacyId);
    if (!doc) throw notFound('Media item not found');
    return toNormalized(doc);
  },
};
