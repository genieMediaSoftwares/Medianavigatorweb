import { vi } from 'vitest';
import type { NormalizedMedia, PlatformType } from '../../shared/types.js';
import type { ProviderAdapter } from '../src/integrations/types.js';

export function makeMedia(n: number, platform: PlatformType = 'instagram', opts: { startEng?: number; prefix?: string; daysAgoStart?: number } = {}): NormalizedMedia[] {
  const prefix = opts.prefix ?? platform.slice(0, 2);
  return Array.from({ length: n }, (_, i) => {
    const eng = (opts.startEng ?? 2) + (i % 7) * 0.8;
    const published = new Date(Date.now() - ((opts.daysAgoStart ?? 1) + i * 3) * 86_400_000);
    return {
      id: `${prefix}_${i + 1}`, workspaceId: 'x', platform, platformContentId: `${i + 1}`,
      contentType: i % 3 === 0 ? 'reel' : i % 3 === 1 ? 'post' : 'carousel',
      title: `Post ${i + 1}`, caption: i % 2 ? `Question about topic${i % 4}? #tag${i % 3} #common` : `Statement ${i} #common`,
      thumbnailUrl: 'https://img.example/t.jpg', publishedAt: published.toISOString(),
      primarySignal: { label: 'Engagement', value: `${eng}%`, status: 'Average' },
      views: 1000 + i * 100, reach: 800 + i * 50, engagementRate: Number(eng.toFixed(2)), shares: i, likes: 50 + i * 5, comments: 5 + i,
      explanation: { observedFact: '', possibleReason: '', whatToRepeat: [] },
    } as NormalizedMedia;
  });
}

/** Controllable stand-in for the real provider clients. Tests never call real provider APIs. */
export const fake = {
  items: [] as NormalizedMedia[],
  fetchError: null as Error | null,
  failTimes: 0,
  partialReason: undefined as string | undefined,
  permissionError: undefined as { message: string; missing: string[] } | undefined,
  validateResult: { isValid: true } as { isValid: boolean; error?: string; kind?: 'expired' | 'permission' | 'invalid' },
  accountId: 'acct-1',
  fetchCalls: 0,
  reset() {
    this.items = []; this.fetchError = null; this.failTimes = 0; this.partialReason = undefined; this.permissionError = undefined;
    this.validateResult = { isValid: true }; this.accountId = 'acct-1'; this.fetchCalls = 0;
  },
};

export function fakeAdapter(platform: PlatformType): ProviderAdapter {
  return {
    platform,
    capabilities: { platform, unavailableMetrics: ['watchTimeMinutes'], unsupportedContent: [], supportsOAuth: true, supportsPkce: false, incrementalInsights: true, notes: [] },
    validate: vi.fn(async () => fake.validateResult),
    resolveAccount: vi.fn(async () => ({
      providerAccountId: `${platform}-${fake.accountId}`, handle: `@${platform}_${fake.accountId}`, displayName: 'Fake', accountInfo: { id: `${platform}-${fake.accountId}`, followersCount: 100, mediaCount: fake.items.length },
      credentialsPatch: { accountId: `${platform}-${fake.accountId}` },
    })),
    fetchContent: vi.fn(async () => {
      fake.fetchCalls++;
      if (fake.failTimes > 0) { fake.failTimes--; throw new Error('Provider temporarily unavailable (503)'); }
      if (fake.fetchError) throw fake.fetchError;
      return { items: fake.items.filter((i) => i.platform === platform), partialReason: fake.partialReason, permissionError: fake.permissionError };
    }),
  };
}
