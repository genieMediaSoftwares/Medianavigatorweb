export interface InstagramAd {
  id: string;
  adAccountId: string;
  name: string;
  campaign: string;
  adSet: string;
  status: string;
  category: 'boosted_post' | 'ad';
  sourceMediaId: string | null;
  currency: string | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  spend: number | null;
  dateStart: string | null;
  dateStop: string | null;
  syncedAt: string;
}
export interface InstagramAdsSync {
  status: 'ready' | 'partial' | 'permission_required' | 'unavailable';
  message: string;
  checkedAt: string;
}
export interface InstagramAdsBatch { items: InstagramAd[]; sync: InstagramAdsSync }
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
export interface InstagramAdsPage {
  connected: boolean;
  sync: InstagramAdsSync | null;
  items: InstagramAd[];
  nextCursor: string | null;
  /** The posts that are running as a boost or an ad right now. */
  boostedMediaIds: string[];
  /** The account's own best posts that are not boosted yet, with the measured reason to boost them. */
  nextBoosts: NextBoost[];
}
