import { listBoostedMediaIds, listInstagramAds } from '../services/instagramAds.service.js';
import type { adsQuery } from '../services/instagramAds.service.js';
import type { z } from 'zod';
import { badRequest } from '../lib/errors.js';
import { looksLikeMp4 } from '../services/ai/videoInput.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { analyticsService } from '../services/analytics.service.js';
import { aiAnalysisService } from '../services/ai/aiAnalysis.service.js';
import { contentAnalysisService } from '../services/ai/contentAnalysis.service.js';
import { diagnosisService } from '../services/ai/diagnosis.service.js';
import { creativeReportService } from '../services/ai/creativeReport.service.js';
import { deepReportService } from '../services/ai/deepReport.service.js';
import { deepV2Jobs } from '../services/ai/deepV2.jobs.js';
import { oauthEnabled } from '../services/oauth.service.js';
import { PLATFORMS, getAdapter } from '../integrations/registry.js';
import { storageEnabled } from '../lib/storage.js';
import { emailEnabled } from '../services/email.service.js';

const uid = (req: any) => req.auth!.userId as string;

export const intelligenceController = {
  ads: asyncHandler(async (req, res) => ok(res, await listInstagramAds(uid(req), req.query as z.infer<typeof adsQuery>))),
  boostedAds: asyncHandler(async (req, res) => ok(res, { mediaIds: await listBoostedMediaIds(uid(req)) })),
  startDeepV2: asyncHandler(async (req, res) => {
    const b = req.body as { postId: string; reanalyze?: boolean; goal?: string };
    const state = await deepV2Jobs.start(uid(req), b.postId, b.reanalyze, b.goal);
    ok(res, state, state.status === 'queued' || state.status === 'processing' ? 202 : 200);
  }),
  getDeepV2: asyncHandler(async (req, res) => ok(res, await deepV2Jobs.get(uid(req), req.params.jobId as string))),
  refreshDeepAudience: asyncHandler(async (req, res) => ok(res, await deepV2Jobs.refreshAudience(uid(req), req.params.jobId as string))),
  cancelDeepV2: asyncHandler(async (req, res) => ok(res, await deepV2Jobs.cancel(uid(req), req.params.jobId as string))),
  savedDeepV2: asyncHandler(async (req, res) => ok(res, await deepV2Jobs.saved(uid(req), req.params.jobId as string))),
  saveDeepV2: asyncHandler(async (req, res) => ok(res, await deepV2Jobs.save(uid(req), req.params.jobId as string, req.params.actionId as string))),
  unsaveDeepV2: asyncHandler(async (req, res) => ok(res, await deepV2Jobs.unsave(uid(req), req.params.jobId as string, req.params.actionId as string))),
  deepReport: asyncHandler(async (req, res) => {
    const b = req.body as { mediaId: string; reanalyze?: boolean };
    ok(res, await deepReportService.analyze(uid(req), b.mediaId, b.reanalyze));
  }),
  creativeReport: asyncHandler(async (req, res) => {
    const b = req.body as { mediaId: string; type: 'why_top' | 'why_bottom'; reanalyze?: boolean };
    ok(res, await creativeReportService.analyze(uid(req), b.mediaId, b.type, b.reanalyze));
  }),
  contentAnalysis: asyncHandler(async (req, res) => {
    const b = req.body as { mediaId: string; type: 'deep' | 'why_top' | 'why_bottom'; reanalyze?: boolean; rank?: string };
    ok(res, await contentAnalysisService.analyze(uid(req), b.mediaId, b.type, { reanalyze: b.reanalyze, rank: b.rank ?? null }));
  }),
  uploadContentAnalysis: asyncHandler(async (req, res) => {
    if (!req.file || !looksLikeMp4(req.file.buffer)) throw badRequest('Choose an original MP4 or MOV video file.');
    const b = req.body as { mediaId: string; type: 'deep' | 'why_top' | 'why_bottom' };
    ok(res, await contentAnalysisService.analyze(uid(req), b.mediaId, b.type, { reanalyze: true, uploadedVideo: req.file.buffer }));
  }),
  savedContentAnalysis: asyncHandler(async (req, res) => {
    const q = req.query as { mediaId: string; type: 'deep' | 'why_top' | 'why_bottom' };
    ok(res, await contentAnalysisService.get(uid(req), q.mediaId, q.type));
  }),
  /** The post's own diagnosis: classified against the account's baseline, then analysed to match. */
  diagnosis: asyncHandler(async (req, res) => {
    const b = req.body as { mediaId: string; reanalyze?: boolean };
    ok(res, await diagnosisService.analyze(uid(req), b.mediaId, { reanalyze: b.reanalyze }));
  }),
  savedDiagnosis: asyncHandler(async (req, res) => {
    const q = req.query as { mediaId: string };
    ok(res, await diagnosisService.get(uid(req), q.mediaId));
  }),
  overview: asyncHandler(async (req, res) => ok(res, await analyticsService.overview(uid(req)))),
  timing: asyncHandler(async (req, res) => ok(res, await analyticsService.timing(uid(req)))),
  signals: asyncHandler(async (req, res) => ok(res, { title: 'What should you know right now?', insights: await analyticsService.signals(uid(req)) })),
  performers: asyncHandler(async (req, res) => ok(res, await analyticsService.performers(uid(req), (req.query as any).sortBy, (req.query as any).platform))),
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
};
