// DEMO ONLY: fake Media Navigator API with sample data, for previewing the web app without the real backend.
// Run: node preview-mock-api.mjs   (listens on http://127.0.0.1:4100)
import http from 'node:http';

const now = Date.now();
const ago = (d, h = 0) => new Date(now - d * 864e5 - h * 36e5).toISOString();
const PAL=[['#0ea5e9','#6366f1'],['#f59e0b','#ef4444'],['#10b981','#0ea5e9'],['#8b5cf6','#ec4899'],['#f97316','#eab308'],['#14b8a6','#3b82f6']];
const thumb = (seed) => { const i = parseInt(seed.replace(/\D/g,''))||0; const [a,b]=PAL[i%PAL.length]; const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='750'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='600' height='750' fill='url(#g)'/><circle cx='${150+i*37%300}' cy='${200+i*53%300}' r='140' fill='white' opacity='.15'/><circle cx='460' cy='620' r='200' fill='white' opacity='.1'/></svg>`; return 'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'); };

const user = { id: 'u1', email: 'demo@geniemedia.in', role: 'admin', status: 'active', createdAt: ago(60), lastLoginAt: ago(0), credits: 42, freeTopChecksRemaining: 3, freeBottomChecksRemaining: 3 };
const profile = { fullName: 'Kartik Kadavala', organization: 'Genie Media', accountType: 'Marketing agency', timezone: 'Asia/Kolkata', avatarFileId: null, onboardingCompleted: true };

const caps = (platform) => ({ platform, unavailableMetrics: platform === 'linkedin' ? ['views'] : [], unsupportedContent: [], supportsOAuth: true, supportsPkce: true, incrementalInsights: true, notes: [] });
const conn = (platform, name, handle, connected, status, followers, points) => ({
  platform, name, accountHandle: handle, connected, lastSyncedAt: ago(0, 2), status, primaryStrength: connected ? 'Reels drive most reach' : '', dataPointsCount: points, missingPermissions: [],
  accountInfo: connected ? { id: platform + '1', name, username: handle, followersCount: followers, followingCount: 310, mediaCount: 186 } : undefined,
  sync: { state: connected ? 'idle' : 'never', lastSyncedAt: connected ? ago(0, 2) : null, nextSyncAt: connected ? ago(-0.2) : null, lastError: null },
  capabilities: caps(platform), oauthAvailable: true, authMethod: connected ? 'oauth' : null,
});
const connections = [
  conn('instagram', 'Genie Media', 'geniemedia.in', true, 'sync_complete', 24800, 18420),
  conn('youtube', 'Genie Studio', 'GenieStudio', true, 'sync_complete', 8650, 6240),
  conn('facebook', 'Genie Media', 'geniemedia', false, 'not_connected', 0, 0),
  conn('linkedin', 'KK Digital Growth', 'kk-digital-growth', false, 'not_connected', 0, 0),
];

const titles = [
  ['reel', 'instagram', '3 hooks that doubled our client\'s reach'], ['carousel', 'instagram', 'Vizag café rebrand: before vs after'],
  ['reel', 'instagram', 'Day in the life at our podcast studio'], ['post', 'instagram', 'We\'re hiring: video editor'],
  ['short', 'youtube', 'Why your reels stop at 2 seconds'], ['video', 'youtube', 'Full Meta Ads walkthrough for local businesses'],
  ['reel', 'instagram', 'Client testimonial — 4S Hospital'], ['carousel', 'instagram', '7 SEO mistakes small businesses make'],
  ['short', 'youtube', 'Google Business Profile in 60 seconds'], ['reel', 'instagram', 'Behind the shoot: saree campaign'],
  ['post', 'instagram', 'Diwali offer for new clients'], ['video', 'youtube', 'How we plan a month of content'],
];
const media = titles.map(([contentType, platform, title], i) => {
  const views = Math.round([48200, 12400, 31800, 3900, 22600, 9800, 18700, 15100, 27400, 41300, 2800, 7600][i]);
  const er = [7.8, 4.1, 6.2, 1.9, 5.4, 3.2, 5.9, 4.7, 6.8, 7.1, 1.6, 2.9][i];
  const likes = Math.round(views * er / 100 * 0.8);
  return {
    id: 'm' + (i + 1), platform, platformContentId: 'p' + i, contentType, title, caption: title + ' — full caption with hashtags #vizag #marketing #geniemedia',
    thumbnailUrl: thumb('mn' + i), publishedAt: ago(i * 2 + 1, i), durationSeconds: ['reel', 'short'].includes(contentType) ? 28 + i : contentType === 'video' ? 640 : undefined,
    views, reach: Math.round(views * 0.82), likes, comments: Math.round(likes * 0.08), shares: Math.round(likes * 0.12), engagementRate: er,
    watchTimeMinutes: platform === 'youtube' ? Math.round(views * 0.4) : undefined, unavailableMetrics: [], contentTypeBasis: 'provider',
  };
});
const cls = (er) => (er >= 6 ? 'TOP' : er < 3 ? 'LOW' : 'TYPICAL');
const slim = (m) => ({ id: m.id, platform: m.platform, contentType: m.contentType, title: m.title, publishedAt: m.publishedAt, views: m.views, likes: m.likes, comments: m.comments, shares: m.shares, engagementRate: m.engagementRate, classification: cls(m.engagementRate), vsMedianEngagementPct: Math.round((m.engagementRate / 4.9 - 1) * 100) });

const period = (from, count, med, views, total) => ({ from: ago(from), to: ago(from - 30), count, medianEngagementRate: med, meanEngagementRate: med + 0.3, medianViews: views, totalViews: total });
const summary = {
  calcVersion: 3, scope: 'all', platformsIncluded: ['instagram', 'youtube'], platformsConnectedWithoutData: [],
  dataPeriod: { days: 30, current: period(30, 12, 4.9, 16900, 241600), previous: period(60, 10, 4.1, 13200, 168400) },
  periodComparison: { engagementRateMedianChangePct: 19.5, viewsMedianChangePct: 28.0, comparable: true },
  baselines: { instagram: { sampleSize: 140, medianEngagementRate: 4.9, p25EngagementRate: 3.1, p75EngagementRate: 6.4, medianViews: 15800, p25Views: 7200, p75Views: 29400 }, youtube: { sampleSize: 46, medianEngagementRate: 4.2, p25EngagementRate: 2.8, p75EngagementRate: 5.9, medianViews: 11200, p25Views: 5400, p75Views: 21800 } },
  classificationMethod: 'Compared with your own 25th/75th percentile engagement',
  contentTypePerformance: [
    { platform: 'instagram', contentType: 'reel', count: 62, medianEngagementRate: 6.4, meanEngagementRate: 6.6, medianViews: 28400 },
    { platform: 'instagram', contentType: 'carousel', count: 34, medianEngagementRate: 4.4, meanEngagementRate: 4.6, medianViews: 12100 },
    { platform: 'instagram', contentType: 'post', count: 44, medianEngagementRate: 2.1, meanEngagementRate: 2.3, medianViews: 4200 },
    { platform: 'youtube', contentType: 'short', count: 28, medianEngagementRate: 5.8, meanEngagementRate: 5.9, medianViews: 21400 },
    { platform: 'youtube', contentType: 'video', count: 18, medianEngagementRate: 3.1, meanEngagementRate: 3.3, medianViews: 8800 },
  ],
  topicPerformance: [
    { topic: 'Behind the scenes', count: 22, recentCount: 6, medianEngagementRate: 6.9, trend: 18 },
    { topic: 'Marketing tips', count: 38, recentCount: 8, medianEngagementRate: 5.6, trend: 9 },
    { topic: 'Client results', count: 16, recentCount: 3, medianEngagementRate: 5.2, trend: 4 },
    { topic: 'Offers & hiring', count: 19, recentCount: 2, medianEngagementRate: 1.8, trend: -12 },
  ],
  trendingTopics: [{ topic: 'Behind the scenes', count: 22, recentCount: 6, medianEngagementRate: 6.9, trend: 18 }, { topic: 'Marketing tips', count: 38, recentCount: 8, medianEngagementRate: 5.6, trend: 9 }],
  topContent: media.filter((m) => m.engagementRate >= 6).map(slim),
  needsImprovement: media.filter((m) => m.engagementRate < 3.3).map(slim),
  insufficientHistory: [], timezone: 'Asia/Kolkata', dataVersion: 'v1', lastSyncedAt: ago(0, 2),
  contentIdeas: { generatedBy: 'gemini', items: [
    { source: 'pattern', idea: 'Film a 30-second "how we edit a reel" behind-the-scenes clip', basedOn: 'Behind-the-scenes reels earn 41% more engagement than your median' },
    { source: 'topic', idea: 'Turn the 7 SEO mistakes carousel into a YouTube Short', basedOn: 'Carousel saved 3× more than average' },
    { source: 'timing', idea: 'Post your next client result on Thursday evening', basedOn: 'Thursday evenings are your strongest window' },
  ] },
};

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const tods = ['Morning', 'Afternoon', 'Evening', 'Night'];
const timing = {
  hasData: true, title: 'When your audience responds', subtitle: 'Based on 186 posts, in Asia/Kolkata time',
  strongestWindow: { label: 'Thursday evening', timeSlot: '6 PM – 9 PM', confidence: 'High', supportingText: 'Posts in this window earn 34% higher engagement than your median, across 21 posts.' },
  matrix: days.flatMap((day, di) => tods.map((timeOfDay, ti) => ({ day, timeOfDay, score: Math.round(30 + 50 * Math.abs(Math.sin(di * 1.3 + ti * 0.9)) + (day === 'Thu' && timeOfDay === 'Evening' ? 20 : 0)), sampleCount: 3 + ((di + ti) % 6) }))),
  timezone: 'Asia/Kolkata',
};

const overview = {
  hasData: true,
  hero: { hasData: true, heading: 'Reels are carrying your growth this month', summary: 'Median engagement is up 19.5% vs the previous 30 days, driven by behind-the-scenes reels. Static posts are dragging the average down.', badge: 'Improving', confidence: 'High' },
  signals: [
    { id: 's1', category: 'Opportunity', icon: 'trending-up', title: 'Behind-the-scenes reels are your strongest format', description: '6 recent BTS reels averaged 6.9% engagement, 41% above your median.', actionText: 'Plan another', actionTarget: '/plan' },
    { id: 's2', category: 'Watch', icon: 'alert-triangle', title: 'Static offer posts underperform', description: 'Offer and hiring posts sit at 1.8% engagement, in your bottom quartile.', actionText: 'See posts', actionTarget: '/posts?tab=needs-work' },
    { id: 's3', category: 'Timing', icon: 'clock', title: 'Thursday evening is your best window', description: '34% higher engagement in the 6–9 PM slot.', actionText: 'Best times', actionTarget: '/insights?tab=best-times' },
  ],
  observations: [
    { id: 'o1', icon: 'eye', title: 'Views per reel up 28%', explanation: 'Hooks in the first 2 seconds improved retention.', details: { trend: '+28%', impact: 'High', observedSignal: 'Median reel views 28.4K vs 22.2K' } },
    { id: 'o2', icon: 'message-circle', title: 'Comments concentrated on client stories', explanation: 'Testimonials get 2× the comments of tips.', details: { trend: '+2×', impact: 'Medium', observedSignal: '74 vs 36 median comments' } },
  ],
  connections,
};

const perf = (m, top) => ({ id: 'pf' + m.id, mediaId: m.id, title: m.title, caption: m.caption, platform: m.platform, contentType: m.contentType, views: m.views, reach: m.reach, likes: m.likes, comments: m.comments, shares: m.shares, engagementRate: m.engagementRate,
  baselineComparison: top ? `${Math.round((m.engagementRate / 4.9 - 1) * 100)}% above your median` : `${Math.round((1 - m.engagementRate / 4.9) * 100)}% below your median`, isTopPerformer: top,
  possibleFactors: top ? ['Strong hook in the first 2 seconds', 'Face on camera', 'Trending audio'] : ['No hook text', 'Static image', 'Posted on a weak slot'],
  patternToReplicateOrImprove: top ? 'Open with the result, then show the process' : 'Convert into a short reel with a text hook', publishedAt: m.publishedAt, thumbnailUrl: m.thumbnailUrl });

const routes = {
  'GET /auth/me': { user, profile },
  'GET /connections': connections,
  'GET /intelligence/overview': overview,
  'GET /intelligence/summary': summary,
  'GET /intelligence/timing': timing,
  'GET /intelligence/history': Array.from({ length: 12 }, (_, i) => ({ date: ago((11 - i) * 7).slice(0, 10), engagementRate: +(3.6 + i * 0.12 + Math.sin(i) * 0.4).toFixed(2), views: 11000 + i * 900 + Math.round(Math.sin(i) * 1500), posts: 3 + (i % 3) })),
  'GET /intelligence/signals': { title: 'What stands out', insights: overview.signals.map((s, i) => ({ id: 'ai' + i, category: s.category, icon: s.icon, title: s.title, description: s.description, whyItMatters: 'This affects how many people your next posts reach.', confidence: i ? 'Medium' : 'High', detectedAt: ago(i), recommendedAction: s.actionText })) },
  'GET /intelligence/performers': { top: media.filter((m) => m.engagementRate >= 5.9).map((m) => perf(m, true)), bottom: media.filter((m) => m.engagementRate < 3.3).map((m) => perf(m, false)) },
  'GET /intelligence/patterns': summary.contentTypePerformance.map((c) => ({ format: `${c.platform} ${c.contentType}`, count: c.count, avgEngagement: c.meanEngagementRate, avgViews: c.medianViews })),
  'GET /intelligence/recommendations': { title: 'Recommended next moves', items: [
    { id: 'r1', type: 'CREATE', title: 'Behind-the-scenes reel of a client shoot', reason: 'Your BTS reels beat your median by 41%.', supportingSignal: '6 posts, 6.9% median engagement', actionText: 'Add to plan', status: 'pending', suggestedSlot: { day: 'Thursday', time: '19:00', format: 'reel' } },
    { id: 'r2', type: 'REPURPOSE', title: 'Turn "7 SEO mistakes" into a YouTube Short', reason: 'High saves on Instagram; Shorts reach new audiences.', supportingSignal: '3× average saves', actionText: 'Add to plan', status: 'pending', suggestedSlot: { day: 'Saturday', time: '11:00', format: 'short' } },
    { id: 'r3', type: 'TEST', title: 'Test a text hook on your next offer post', reason: 'Offer posts sit in your bottom quartile.', supportingSignal: '1.8% median engagement', actionText: 'Add to plan', status: 'planned' },
  ] },
  'GET /intelligence/trends': { title: 'Trends worth watching', trends: [
    { id: 't1', name: 'Day-in-the-life studio vlogs', category: 'Format', status: 'Rising', explanation: 'Agency BTS content is gaining reach in your niche.', changeRate: '+22%', recommendedPlatform: 'instagram', suggestedFormat: 'reel', suggestedHook: 'POV: you run a creative agency in Vizag' },
    { id: 't2', name: 'Local SEO explainers', category: 'Topic', status: 'Stable', explanation: 'Steady interest from small business owners.', changeRate: '+4%', recommendedPlatform: 'youtube', suggestedFormat: 'short' },
    { id: 't3', name: 'Static promo graphics', category: 'Format', status: 'Losing momentum', explanation: 'Reach on static offers keeps falling.', changeRate: '-15%' },
  ] },
  'GET /intelligence/status': { ai: { available: true, model: 'gemini-2.5-flash', promptVersion: 'v4' }, storage: { available: true }, email: { available: true }, providers: connections.map((c) => ({ platform: c.platform, oauthAvailable: true, capabilities: c.capabilities })) },
  'GET /intelligence/archive': { hasData: true, totalAnalyzed: 186, totalReels: 90, totalPostsAndCarousels: 96, totalVerifiedViews: 2840000, totalInteractions: 148200, avgEngagementRate: 4.9, formats: [
    { format: 'Reel', count: 90, percentageOfLibrary: 48, totalViews: 2100000, avgViews: 23300, avgLikes: 1420, avgComments: 88, avgEngagement: 6.4, isTopFormat: true, recommendationNote: 'Keep reels as your core format' },
    { format: 'Carousel', count: 34, percentageOfLibrary: 18, totalViews: 410000, avgViews: 12100, avgLikes: 520, avgComments: 31, avgEngagement: 4.4 },
    { format: 'Post', count: 62, percentageOfLibrary: 34, totalViews: 330000, avgViews: 5300, avgLikes: 110, avgComments: 9, avgEngagement: 2.1, recommendationNote: 'Convert some static posts into reels' },
  ], topWinningFormat: 'Reel' },
  'GET /planner': [
    { id: 'pl1', day: 'Monday', time: '10:00', platform: 'instagram', contentType: 'carousel', title: '5 Meta Ads settings to check', status: 'scheduled' },
    { id: 'pl2', day: 'Thursday', time: '19:00', platform: 'instagram', contentType: 'reel', title: 'BTS: saree campaign shoot', isRecommended: true, recommendationReason: 'Best window + strongest format', status: 'scheduled' },
    { id: 'pl3', day: 'Saturday', time: '11:00', platform: 'youtube', contentType: 'short', title: 'GBP posting in 60 seconds', status: 'draft' },
  ],
  'GET /planner/insights': { timezone: 'Asia/Kolkata', hasEnoughData: true, bestWindows: [
    { day: 'Thursday', timeOfDay: 'Evening', timeSlot: '6 PM – 9 PM', meanEngagementRate: 6.6, sampleCount: 21, timezone: 'Asia/Kolkata' },
    { day: 'Saturday', timeOfDay: 'Morning', timeSlot: '9 AM – 12 PM', meanEngagementRate: 5.9, sampleCount: 17, timezone: 'Asia/Kolkata' },
  ], recommendedFormats: summary.contentTypePerformance.slice(0, 3), topTopics: summary.topicPerformance.slice(0, 3), contentGaps: [], basedOn: { posts: 186, platforms: ['instagram', 'youtube'], method: 'median engagement by slot' } },
  'GET /notifications/unread-count': { unread: 3 },
  'GET /users/me/sessions': { sessions: [{ id: 'se1', current: true, userAgent: 'Chrome on macOS', ip: '49.37.x.x', lastUsedAt: ago(0), createdAt: ago(3) }] },
  'GET /admin/system': { app: { environment: 'development', uptimeSeconds: 86400 * 3, node: 'v22' }, database: { status: 'ok' }, counts: { users: 14, activeSessions: 9, contentItems: 1840, aiCacheEntries: 320 }, connectedAccountsByStatus: { connected: 11, connection_expired: 1 }, syncRunsByStatus: { succeeded: 120, failed: 3 }, storage: { configured: true, files: 42, bytes: 81e6 }, features: { ai: { configured: true, model: 'gemini-2.5-flash' }, email: { configured: true }, syncWorker: true, syncScheduler: true, oauth: { instagram: true, facebook: true, youtube: true, linkedin: false } } },
};
const notifications = [
  { id: 'n1', type: 'insight', icon: 'trending-up', title: 'A reel is outperforming', description: '"3 hooks that doubled our client\'s reach" is 59% above your median.', severity: 'info', createdAt: ago(0, 3), read: false },
  { id: 'n2', type: 'sync', icon: 'refresh', title: 'Instagram sync finished', description: '12 new posts analysed.', severity: 'info', createdAt: ago(0, 5), read: false },
  { id: 'n3', type: 'warning', icon: 'alert-triangle', title: 'Offer posts are dropping', description: 'Engagement on static offers fell 12% this month.', severity: 'medium', createdAt: ago(1), read: false },
];

const send = (res, status, body, meta) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(status < 400 ? { success: true, data: body, meta } : { success: false, error: body })); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/^\/api\/v1/, '').replace(/\/$/, '');
  const key = `${req.method} ${p}`;
  if (key === 'POST /auth/login' || key === 'POST /auth/register') return send(res, 200, { user, profile, tokens: { accessToken: 'demo-at', refreshToken: 'demo-rt', expiresIn: 86400, refreshExpiresIn: 2592000 }, accessToken: 'demo-at', refreshToken: 'demo-rt' });
  if (key === 'POST /auth/refresh') return send(res, 200, { accessToken: 'demo-at', refreshToken: 'demo-rt', tokens: { accessToken: 'demo-at', refreshToken: 'demo-rt', expiresIn: 86400, refreshExpiresIn: 2592000 } });
  if (key === 'GET /media') {
    const plat = url.searchParams.get('platform');
    const items = plat && plat !== 'all' ? media.filter((m) => m.platform === plat) : media;
    return send(res, 200, items, { limit: 24, nextCursor: null, total: items.length });
  }
  if (req.method === 'GET' && p.startsWith('/media/')) return send(res, 200, media.find((m) => m.id === p.split('/')[2]) ?? media[0]);
  if (key === 'GET /notifications') return send(res, 200, notifications, { limit: 25, nextCursor: null, total: 3 });
  if (key === 'GET /files') return send(res, 200, [], { limit: 25, nextCursor: null, total: 0 });
  if (['GET /admin/users', 'GET /admin/connections', 'GET /admin/sync-runs', 'GET /admin/audit-logs'].includes(key)) return send(res, 200, key.endsWith('users') ? [user] : [], { limit: 25, nextCursor: null });
  if (routes[key]) return send(res, 200, routes[key]);
  console.log('unmocked', key);
  if (req.method !== 'GET') return send(res, 200, {});
  return send(res, 404, { code: 'NOT_FOUND', message: 'Not available in demo' });
}).listen(4100, () => console.log('mock on 4100'));
