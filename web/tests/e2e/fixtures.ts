/**
 * Test-only API doubles. Mocks are allowed here and nowhere else in the app.
 * Every browser call to /api/v1/* is answered by the handlers given to mockApi; anything unmocked fails loudly.
 */
import type { BrowserContext, Page, Route } from '@playwright/test';

export type Handler = (body: unknown, url: URL, route: Route) => { status?: number; body: unknown } | Promise<{ status?: number; body: unknown }>;

const ok = (data: unknown, meta?: unknown) => ({ status: 200, body: meta ? { success: true, data, meta } : { success: true, data } });
export const reply = { ok, created: (data: unknown) => ({ status: 201, body: { success: true, data } }), accepted: (data: unknown) => ({ status: 202, body: { success: true, data } }) };

/** `handlers` keys look like "GET /connections" (path below /api/v1, no query string). */
export async function mockApi(page: Page, handlers: Record<string, Handler>) {
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const key = `${req.method()} ${url.pathname.replace(/^\/api\/v1/, '')}`;
    const handler = handlers[key];
    if (!handler) {
      await route.fulfill({ status: 599, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'UNMOCKED', message: `No test mock for ${key}` } }) });
      return;
    }
    const raw = req.postData();
    let body: unknown = raw;
    try { body = raw ? JSON.parse(raw) : undefined; } catch { /* multipart or text */ }
    const res = await handler(body, url, route);
    await route.fulfill({ status: res.status ?? 200, contentType: 'application/json', headers: { 'x-request-id': 'e2e' }, body: JSON.stringify(res.body) });
  });
}

/** Marks the browser as signed in for proxy.ts (it only checks that the session cookie exists). */
export async function signIn(context: BrowserContext, baseURL: string) {
  await context.addCookies([{ name: 'mn_rt', value: 'e2e-session', url: baseURL, httpOnly: true, sameSite: 'Lax' }]);
}

// ---------------------------------------------------------------- builders

export const user = (role: 'user' | 'admin' = 'user') => ({ id: 'u1', email: 'sam@example.test', role, status: 'active', createdAt: '2026-01-01T00:00:00Z', lastLoginAt: null });
export const profile = (over: Partial<Record<string, unknown>> = {}) => ({
  fullName: 'Sam Rivera', organization: null, accountType: null, timezone: 'Europe/London', avatarFileId: null, onboardingCompleted: true, ...over,
});
export const me = (role: 'user' | 'admin' = 'user', p = profile()) => ({ user: user(role), profile: p });

const caps = (platform: string) => ({ platform, unavailableMetrics: platform === 'youtube' ? ['reach', 'shares', 'saves'] : ['watchTimeMinutes'], unsupportedContent: [], supportsOAuth: true, supportsPkce: false, incrementalInsights: false, notes: [] });
const NAMES: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', linkedin: 'LinkedIn' };

export function connection(platform: string, state: 'none' | 'synced' | 'syncing' = 'none') {
  const live = state !== 'none';
  return {
    platform, name: NAMES[platform], accountHandle: live ? `@sam_${platform}` : 'Not connected', connected: live,
    lastSyncedAt: live ? '2026-10-08T08:00:00Z' : '', status: state === 'none' ? 'not_connected' : state === 'syncing' ? 'syncing' : 'sync_complete',
    statusMessage: null, dataPointsCount: live ? 12 : 0, accountInfo: live ? { id: 'acc', followersCount: 340 } : null,
    sync: { state: live ? 'synced' : 'disconnected', lastSyncedAt: live ? '2026-10-08T08:00:00Z' : null, nextSyncAt: null, lastError: null },
    capabilities: caps(platform), oauthAvailable: false,
  };
}
export const connections = (connected: Record<string, 'synced' | 'syncing'> = {}) =>
  ['instagram', 'facebook', 'youtube', 'linkedin'].map((p) => connection(p, connected[p] ?? 'none'));

export const syncRun = (status: string, platform = 'instagram') => ({
  id: 'run1', platform, type: 'manual', status, queuedAt: '2026-10-08T09:00:00Z', startedAt: null, completedAt: null, durationMs: null,
  items: { fetched: status === 'succeeded' ? 14 : 3, created: status === 'succeeded' ? 2 : 0, updated: status === 'succeeded' ? 12 : 0, skipped: 0, failed: 0 },
  attempts: 1, errorKind: null, errorSummary: null,
});

export const media = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'yt_1', platform: 'youtube', contentType: 'short', title: 'How I edit in 60 seconds', caption: 'Quick tips #editing', thumbnailUrl: '', mediaUrl: null,
  publishedAt: '2026-09-20T18:00:00Z', durationSeconds: 58, views: 4200, reach: 0, engagementRate: 5.1, shares: 0, watchTimeMinutes: null,
  likes: 190, comments: 24, unavailableMetrics: ['reach', 'shares', 'saves'], contentTypeBasis: 'inferred', ...over,
});

const period = (count: number) => ({ from: '2026-09-08T00:00:00Z', to: '2026-10-08T00:00:00Z', count, medianEngagementRate: 4.2, meanEngagementRate: 4.6, medianViews: 3100, totalViews: 31000 });
export const summary = () => ({
  scope: 'all', platformsIncluded: ['youtube'], platformsConnectedWithoutData: [],
  dataPeriod: { days: 30, current: period(6), previous: period(5) },
  periodComparison: { engagementRateMedianChangePct: 8.5, viewsMedianChangePct: -3, comparable: true },
  baselines: { youtube: { sampleSize: 12, medianEngagementRate: 4.2, p25EngagementRate: 3.1, p75EngagementRate: 5.0, medianViews: 3100, p25Views: 1800, p75Views: 4400 } },
  classificationMethod: 'User-relative', contentTypePerformance: [], topicPerformance: [], trendingTopics: [], topContent: [], needsImprovement: [],
  insufficientHistory: [], timezone: 'Europe/London', lastSyncedAt: '2026-10-08T08:00:00Z', contentIdeas: { generatedBy: 'rules', items: [] },
});

export const aiMeta = (status: string) => ({ status, model: null, promptVersion: 'v1', generatedAt: null, reason: 'not configured' });

/** Handlers every signed-in page needs (app shell: profile, connections, notification bell). */
export const shell = (opts: { role?: 'user' | 'admin'; connected?: Record<string, 'synced' | 'syncing'> } = {}): Record<string, Handler> => ({
  'GET /auth/me': () => ok(me(opts.role)),
  'GET /connections': () => ok(connections(opts.connected)),
  'GET /notifications/unread-count': () => ok({ unread: 0 }),
  'GET /notifications': () => ok([], { limit: 5, nextCursor: null }),
});
