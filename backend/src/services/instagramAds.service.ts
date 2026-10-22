import { z } from 'zod';
import { InstagramAd } from '../models/InstagramAd.js';
import { connectionRepository } from '../repositories/connection.repository.js';
import { loadAnalyticsContext } from './analytics.service.js';

import type { InstagramAdsPage as AdsPage, NextBoost as NextBoostType } from '../../../shared/instagramAds.js';

export const adsQuery = z.object({ cursor: z.string().max(200).optional(), category: z.enum(['all', 'boosted_post', 'ad']).default('all') });

/** A post that is currently running as a boost or an ad, with the measured reason to spend on it. */
export interface NextBoost {
  mediaId: string;
  title: string;
  thumbnailUrl: string | null;
  contentType: string;
  publishedAt: string;
  views: number;
  reach: number;
  engagementRate: number;
  baselineComparison: string;
  /** Why this post is a good candidate, in measured terms. */
  reason: string;
  /** What is not known about it, so the reader is not over-sold. */
  caveat: string;
}

/** Instagram media ids are stored here as `ig_17983539268493900`; Meta's ad creatives use the bare number. */
const toLocalMediaId = (id: string | null | undefined): string | null => {
  if (!id) return null;
  const bare = id.replace(/^[a-z]+_/i, '');
  return /^\d+$/.test(bare) ? `ig_${bare}` : id;
};

export async function listInstagramAds(userId: string, query: z.infer<typeof adsQuery>): Promise<AdsPage> {
  const account = await connectionRepository.findForUser(userId, 'instagram');
  if (!account?.active) return { connected: false, sync: null, items: [], nextCursor: null, boostedMediaIds: [], nextBoosts: [] };
  const docs = await InstagramAd.find({ userId, connectedAccountId: account._id, instagramAccountId: account.providerAccountId,
    ...(query.cursor ? { adKey: { $gt: query.cursor } } : {}),
    ...(query.category !== 'all' ? { 'record.category': query.category } : {}),
  }).sort({ adKey: 1 }).limit(25).lean();
  const items = docs.slice(0, 24).map(d => d.record);

  // Every post that is running as a boost or an ad, so the post lists can mark them.
  const boostedDocs = await InstagramAd.find({ userId, connectedAccountId: account._id, 'record.sourceMediaId': { $type: 'string' } })
    .select({ 'record.sourceMediaId': 1 }).lean();
  const boostedMediaIds = [...new Set(boostedDocs.map(d => toLocalMediaId(d.record?.sourceMediaId)).filter((id): id is string => Boolean(id)))];

  // What to boost next: the account's own strongest posts that are not boosted yet.
  const nextBoosts: NextBoostType[] = [];
  try {
    const ctx = await loadAnalyticsContext(userId);
    // Boost candidates are the posts that already reach people, ranked by how well they performed.
    // Ranking by engagement alone would surface posts with a handful of views, where the rate is an
    // artefact of a tiny denominator and there is nothing to amplify.
    const top = ctx.engine.getTopPerformers('views', 'instagram')
      .filter((p) => p.views > 0 && p.reach > 0)
      .sort((a, b) => b.engagementRate - a.engagementRate);
    for (const p of top) {
      if (boostedMediaIds.includes(p.mediaId)) continue;
      nextBoosts.push({
        mediaId: p.mediaId, title: p.title, thumbnailUrl: p.thumbnailUrl ?? null, contentType: p.contentType, publishedAt: p.publishedAt,
        views: p.views, reach: p.reach, engagementRate: p.engagementRate, baselineComparison: p.baselineComparison,
        reason: `${p.baselineComparison}. ${p.possibleFactors[0] ?? ''}`.trim(),
        caveat: p.uncertaintyNote ?? 'Paid results depend on budget, audience and placement, not on the post alone.',
      });
      if (nextBoosts.length >= 6) break;
    }
  } catch {
    // A missing ranking is not a reason to hide the ads that were retrieved.
  }

  return { connected: true, sync: account.accountInfo?.ads ?? null, items, nextCursor: docs.length > 24 ? docs[23].adKey : null, boostedMediaIds, nextBoosts };
}
