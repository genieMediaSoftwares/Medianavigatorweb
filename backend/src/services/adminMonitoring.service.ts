import { AiUsage, SystemError } from '../models/AdminTelemetry.js';
import { AiCache } from '../models/AiCache.js';
import { ContentAnalysis } from '../models/ContentAnalysis.js';
import { DeepAnalysisJob, LegacyDeepAnalysisJob } from '../models/DeepAnalysisJob.js';
import { Analytics } from '../models/Analytics.js';
import { SyncRun } from '../models/SyncRun.js';
import { aiAvailable, aiModel } from './ai/geminiClient.js';
import { CREDIT_RULES } from './credits.service.js';
import { permissionCatalogue } from './permissions.js';

export const adminMonitoring = {
  async monitoring() {
    const since = new Date(Date.now() - 30 * 86400_000);
    const [calls, analyses, jobGroups, cacheEntries, snapshots, latestSnapshot, latestCalls] = await Promise.all([
      AiUsage.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$status', count: { $sum: 1 }, averageLatencyMs: { $avg: '$latencyMs' } } }]),
      ContentAnalysis.countDocuments(), Promise.all([DeepAnalysisJob, LegacyDeepAnalysisJob].map((model) => model.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]))),
      AiCache.countDocuments({ expiresAt: { $gt: new Date() } }), Analytics.countDocuments(), Analytics.findOne().sort({ updatedAt: -1 }).select('platform date updatedAt').lean(),
      AiUsage.find().sort({ createdAt: -1 }).limit(25).select('-__v').lean(),
    ]);
    const totals = new Map<string, number>();
    for (const row of jobGroups.flat()) totals.set(row._id, (totals.get(row._id) ?? 0) + row.count);
    const jobs = [...totals].map(([_id, count]) => ({ _id, count }));
    return { generatedAt: new Date(), ai: { configured: aiAvailable(), model: aiModel(), windowStart: since, calls, analyses, jobs, cacheEntries, latestCalls, tokens: null, cost: null, note: 'Call telemetry begins with this release; retained for 90 days. Counts include failed generation attempts. Token usage and billing costs are not recorded.' }, analytics: { snapshots, latestSnapshot }, billing: { subscriptionsImplemented: false, creditRules: CREDIT_RULES } };
  },
  async errors() {
    const [server, sync, analysis, deepGroups] = await Promise.all([
      SystemError.find().sort({ createdAt: -1 }).limit(50).select('-__v').lean(),
      SyncRun.find({ status: { $in: ['failed', 'partial'] } }).sort({ queuedAt: -1 }).limit(50).select('platform status queuedAt errorKind itemsFailed').lean(),
      ContentAnalysis.find({ lastErrorAt: { $ne: null } }).sort({ lastErrorAt: -1 }).limit(50).select('platform analysisType lastErrorAt attempts').lean(),
      Promise.all([DeepAnalysisJob, LegacyDeepAnalysisJob].map((model) => model.find({ status: 'failed' }).sort({ updatedAt: -1 }).limit(50).select('status updatedAt attempts').lean())),
    ]);
    const deep = deepGroups.flat().sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 50);
    return { server, sync, analysis, deep, note: 'Latest 50 records per source. Server errors are retained for 30 days starting with this release. Provider payloads and error messages are excluded to protect credentials and media URLs.' };
  },
  permissions() {
    return permissionCatalogue();
  },
};
