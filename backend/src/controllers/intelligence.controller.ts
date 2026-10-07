import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { analyticsService } from '../services/analytics.service.js';
import { aiAnalysisService } from '../services/ai/aiAnalysis.service.js';
import { userService } from '../services/user.service.js';
import { oauthEnabled } from '../services/oauth.service.js';
import { PLATFORMS, getAdapter } from '../integrations/registry.js';
import { storageEnabled } from '../lib/storage.js';
import { emailEnabled } from '../services/email.service.js';

const uid = (req: any) => req.auth!.userId as string;

export const intelligenceController = {
  overview: asyncHandler(async (req, res) => ok(res, await analyticsService.overview(uid(req)))),
  timing: asyncHandler(async (req, res) => ok(res, await analyticsService.timing(uid(req)))),
  signals: asyncHandler(async (req, res) => ok(res, { title: 'What should you know right now?', insights: await analyticsService.signals(uid(req)) })),
  performers: asyncHandler(async (req, res) => ok(res, await analyticsService.performers(uid(req), (req.query as any).sortBy))),
  patterns: asyncHandler(async (req, res) => ok(res, await analyticsService.patterns(uid(req)))),
  archive: asyncHandler(async (req, res) => ok(res, await analyticsService.archive(uid(req)))),
  summary: asyncHandler(async (req, res) => ok(res, await analyticsService.summary(uid(req), req.query as any))),
  history: asyncHandler(async (req, res) => ok(res, await analyticsService.history(uid(req), req.query as any))),
  recommendations: asyncHandler(async (req, res) => ok(res, { title: 'What should you do next?', items: await analyticsService.recommendations(uid(req)) })),
  trends: asyncHandler(async (req, res) => ok(res, { title: "What's changing?", trends: await analyticsService.trends(uid(req)) })),

  /** What this deployment can and cannot do, so clients never have to guess. */
  status: asyncHandler(async (_req, res) => ok(res, {
    ai: aiAnalysisService.status(),
    storage: { available: storageEnabled() },
    email: { available: emailEnabled() },
    providers: PLATFORMS.map((p) => ({ platform: p, oauthAvailable: oauthEnabled(p), capabilities: getAdapter(p).capabilities })),
  })),

  ask: asyncHandler(async (req, res) => ok(res, await aiAnalysisService.ask(uid(req), req.body.question))),
  analyzeItem: asyncHandler(async (req, res) => ok(res, await aiAnalysisService.analyzeItem(uid(req), req.body.mediaId))),
  diagnose: asyncHandler(async (req, res) => ok(res, await aiAnalysisService.diagnosePost(uid(req), req.body.mediaId, req.body.forcedStatus))),
  analyzeVideo: asyncHandler(async (req, res) => ok(res, await aiAnalysisService.analyzeVideo(uid(req), req.body.mediaId))),
  compare: asyncHandler(async (req, res) => ok(res, await aiAnalysisService.compare(uid(req), req.body.mediaIdA, req.body.mediaIdB))),

  workspace: asyncHandler(async (req, res) => {
    const { user, profile } = await userService.me(uid(req));
    ok(res, {
      id: user.id, name: profile?.organization || profile?.fullName || 'My Workspace', slug: user.id,
      businessType: profile?.accountType || 'Creator', plan: 'Growth' as const, demoMode: false,
    });
  }),
};
