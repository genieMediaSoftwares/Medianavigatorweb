import { startPollLoop } from '../../jobs/pollLoop.js';
import { randomUUID } from 'node:crypto';
import { config } from '../../config/env.js';
import { sha256 } from '../../lib/crypto.js';
import { notFound, unavailable, badRequest } from '../../lib/errors.js';
import { toObjectId } from '../../lib/ids.js';
import { logger } from '../../lib/logger.js';
import { DeepAnalysisJob, SavedDeepAction, type DeepJobDoc } from '../../models/DeepAnalysisJob.js';
import { mediaRepository } from '../../repositories/media.repository.js';
import { aiAvailable } from './geminiClient.js';
import { buildDeepV2, V2_VERSION } from './deepV2.pipeline.js';
import { reportV2Schema } from './deepV2.reportSchema.js';
import type { DeepAnalysisState } from '../../../../shared/deepAnalysisV2.js';
import { buildAudience, collectAudienceInputs } from './deepV2.audience.js';

const view = (job: DeepJobDoc): DeepAnalysisState => ({ postId: job.postId, jobId: String(job._id), status: job.status, progress: job.progress, report: job.report ? reportV2Schema.parse(job.report) : null, error: job.error });
async function owned(userId: string, jobId: string) {
  const job = await DeepAnalysisJob.findOne({ _id: toObjectId(jobId), userId: toObjectId(userId) }).lean<DeepJobDoc>();
  if (!job) throw notFound('Analysis not found');
  const doc = await mediaRepository.findByLegacyId(toObjectId(userId), job.postId);
  if (!doc || String(doc.connectedAccountId) !== String(job.accountId)) throw notFound('Post not found');
  return job;
}
export const deepV2Jobs = {
  async start(userId: string, postId: string, reanalyze = false, goal = 'Learn from this published content and plan useful future content') {
    const uid = toObjectId(userId);
    const doc = await mediaRepository.findByLegacyId(uid, postId);
    if (!doc) throw notFound('Post not found');
    const fingerprint = sha256(JSON.stringify([V2_VERSION, config.ai.model, goal, doc.providerMediaId, doc.connectedAccountId, doc.contentType, doc.caption, doc.title, doc.mediaUrl, doc.videoUrl, doc.syncedAt]));
    const key = { userId: uid, postId, version: V2_VERSION, fingerprint };
    let job = await DeepAnalysisJob.findOne(key).lean<DeepJobDoc>();
    if (job && ['queued', 'processing'].includes(job.status)) return view(job);
    if (job && !reanalyze && (['failed', 'cancelled'].includes(job.status) || Date.now() - (job.report ? Date.parse(job.report.generatedAt) : job.updatedAt.getTime()) < config.ai.contentAnalysis.staleHours * 3600000)) return view(job);
    if (!aiAvailable()) throw unavailable('AI analysis is not configured on this server.');
    try {
      job = await DeepAnalysisJob.findOneAndUpdate({ ...key, status: { $nin: ['queued', 'processing'] } }, { $set: { status: 'queued', goal, accountId: doc.connectedAccountId, progress: { stage: 'Waiting to analyze', processed: 0, total: 1 }, error: null, attempts: 0, leaseOwner: null, leaseExpiresAt: null } }, { upsert: true, new: true, lean: true });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      job = await DeepAnalysisJob.findOne(key).lean<DeepJobDoc>();
    }
    return view(job!);
  },
  async get(userId: string, jobId: string) { return view(await owned(userId, jobId)); },
  async refreshAudience(userId: string, jobId: string) {
    const job = await owned(userId, jobId);
    if (!job.report || ['queued', 'processing'].includes(job.status)) throw badRequest('Wait for the content report to finish before refreshing audience feedback.');
    const doc = await mediaRepository.findByLegacyId(toObjectId(userId), job.postId);
    if (!doc) throw notFound('Post not found');
    const audience = await buildAudience(await collectAudienceInputs(doc));
    reportV2Schema.parse({ ...job.report, audience });
    // Update only audience: no creative media re-upload or replacement of a newer report.
    const updated = await DeepAnalysisJob.updateOne({ _id: job._id, userId: job.userId, 'report.generatedAt': job.report.generatedAt, status: { $nin: ['queued', 'processing'] } }, { $set: { 'report.audience': audience } });
    if (!updated.matchedCount) throw badRequest('This report changed during refresh. Please retry.');
    return this.get(userId, jobId);
  },
  async cancel(userId: string, jobId: string) {
    await owned(userId, jobId);
    await DeepAnalysisJob.updateOne({ _id: toObjectId(jobId), userId: toObjectId(userId), status: { $in: ['queued', 'processing'] } }, { $set: { status: 'cancelled', error: 'Analysis was cancelled.', leaseOwner: null, leaseExpiresAt: null } });
    return this.get(userId, jobId);
  },
  async saved(userId: string, jobId: string) { await owned(userId, jobId); return (await SavedDeepAction.find({ userId: toObjectId(userId), jobId: toObjectId(jobId) }).lean()).map((s) => s.actionId); },
  async save(userId: string, jobId: string, actionId: string) {
    const job = await owned(userId, jobId);
    const action = job.report?.nextMove.actions.find((a) => a.id === actionId);
    if (!action) throw notFound('Recommendation not found');
    await SavedDeepAction.updateOne({ userId: toObjectId(userId), jobId: job._id, actionId }, { $set: { action, postId: job.postId } }, { upsert: true });
    return { actionId, saved: true };
  },
  async unsave(userId: string, jobId: string, actionId: string) { await owned(userId, jobId); await SavedDeepAction.deleteOne({ userId: toObjectId(userId), jobId: toObjectId(jobId), actionId }); return { actionId, saved: false }; },
  async runOne(owner: string = randomUUID()): Promise<boolean> {
    const now = new Date();
    await DeepAnalysisJob.updateMany({ status: 'processing', attempts: { $gte: 3 }, leaseExpiresAt: { $lte: now } }, { $set: { status: 'failed', error: 'Processing was interrupted repeatedly. Please retry.', leaseOwner: null, leaseExpiresAt: null } });
    const job = await DeepAnalysisJob.findOneAndUpdate({ $or: [{ status: 'queued' }, { status: 'processing', leaseExpiresAt: { $lte: now } }], attempts: { $lt: 3 } }, { $set: { status: 'processing', leaseOwner: owner, leaseExpiresAt: new Date(Date.now() + 60000) }, $inc: { attempts: 1 } }, { sort: { createdAt: 1 }, new: true, lean: true });
    if (!job) return false;
    const filter = { _id: job._id, status: 'processing', leaseOwner: owner };
    const heartbeat = setInterval(() => { void DeepAnalysisJob.updateOne(filter, { $set: { leaseExpiresAt: new Date(Date.now() + 60000) } }).catch(() => undefined); }, 15000);
    heartbeat.unref();
    try {
      const doc = await mediaRepository.findByLegacyId(job.userId, job.postId);
      if (!doc || String(doc.connectedAccountId) !== String(job.accountId)) throw notFound('The selected post is no longer available.');
      const report = reportV2Schema.parse(await buildDeepV2(doc, job.goal, async (stage, processed, total) => {
        const updated = await DeepAnalysisJob.updateOne(filter, { $set: { progress: { stage, processed, total }, leaseExpiresAt: new Date(Date.now() + 60000) } });
        if (!updated.matchedCount) throw new Error('Analysis cancelled or lease lost');
      }));
      if (report.postId !== job.postId || report.accountId !== String(job.accountId) || report.platform !== doc.platform) throw new Error('Report identity mismatch');
      await DeepAnalysisJob.updateOne(filter, { $set: { report, status: report.analysisStatus, progress: { stage: report.analysisStatus === 'complete' ? 'Analysis complete' : 'Partial analysis ready', processed: 1, total: 1 }, error: null, leaseOwner: null, leaseExpiresAt: null } });
    } catch {
      await DeepAnalysisJob.updateOne(filter, { $set: { status: 'failed', error: 'Analysis could not be completed. Your previous report, if available, is kept. Please retry.', leaseOwner: null, leaseExpiresAt: null } });
    } finally { clearInterval(heartbeat); }
    return true;
  },
};
export function startDeepV2Worker(): () => Promise<void> {
  return startPollLoop(async () => {
    await DeepAnalysisJob.updateMany({ status: 'processing', attempts: { $gte: 3 }, leaseExpiresAt: { $lte: new Date() } }, { $set: { status: 'failed', error: 'Processing was interrupted repeatedly. Please retry.', leaseOwner: null, leaseExpiresAt: null } });
    await deepV2Jobs.runOne();
  }, 2000, () => logger.warn('deep analysis worker could not process a job'));
}
