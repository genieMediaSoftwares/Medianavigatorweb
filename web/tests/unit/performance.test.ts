import { describe, expect, it } from 'vitest';
import { isUnavailable, tagFor } from '@/lib/performance';
import type { Summary } from '@/types/api';

const summary = (over: Partial<Summary>): Summary => ({
  calcVersion: 1, scope: 'all', platformsIncluded: ['instagram'], platformsConnectedWithoutData: [],
  dataPeriod: { days: 30, current: { from: '', to: '', count: 0, medianEngagementRate: 0, meanEngagementRate: 0, medianViews: 0, totalViews: 0 }, previous: { from: '', to: '', count: 0, medianEngagementRate: 0, meanEngagementRate: 0, medianViews: 0, totalViews: 0 } },
  periodComparison: { engagementRateMedianChangePct: null, viewsMedianChangePct: null, comparable: false }, baselines: {}, classificationMethod: '', contentTypePerformance: [], topicPerformance: [], trendingTopics: [],
  topContent: [], needsImprovement: [], insufficientHistory: [], timezone: 'UTC', dataVersion: '', lastSyncedAt: null, contentIdeas: { generatedBy: 'rules', items: [] }, ...over,
});
const slim = (id: string) => ({ id, platform: 'instagram' as const, contentType: 'reel', title: '', publishedAt: '', views: 1, likes: 1, comments: 1, shares: 0, engagementRate: 1, classification: 'TOP', vsMedianEngagementPct: 1 });

describe('post tags', () => {
  const post = { id: 'p1', platform: 'instagram' as const };
  it('does not guess before the summary has loaded', () => expect(tagFor(post, undefined)).toBe('not-enough-data'));
  it('marks the best and weakest posts and calls the rest typical', () => {
    expect(tagFor(post, summary({ topContent: [slim('p1')] }))).toBe('doing-well');
    expect(tagFor(post, summary({ needsImprovement: [slim('p1')] }))).toBe('could-be-better');
    expect(tagFor(post, summary({}))).toBe('typical');
  });
  it('refuses to classify channels with too little history', () => {
    expect(tagFor(post, summary({ topContent: [slim('p1')], insufficientHistory: ['instagram'] }))).toBe('not-enough-data');
  });
  it('knows which metrics a platform did not provide', () => {
    expect(isUnavailable({ unavailableMetrics: ['reach'], missingMetrics: ['likes'] }, 'likes')).toBe(true);
    expect(isUnavailable({ unavailableMetrics: ['reach'] }, 'reach')).toBe(true);
    expect(isUnavailable({ unavailableMetrics: [] }, 'views')).toBe(false);
  });
});
