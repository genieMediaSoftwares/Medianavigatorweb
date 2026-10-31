import { AiUsage, SystemError } from '../models/AdminTelemetry.js';
import { AiCache } from '../models/AiCache.js';
import { ContentAnalysis } from '../models/ContentAnalysis.js';
import { DeepAnalysisJob } from '../models/DeepAnalysisJob.js';
import { Analytics } from '../models/Analytics.js';
import { SyncRun } from '../models/SyncRun.js';
import { WorkerHeartbeat } from '../models/WorkerHeartbeat.js';
import { AccountDeletion } from '../models/AccountDeletion.js';
import { aiAvailable, aiModel } from './ai/geminiClient.js';
import { permissionCatalogue } from './permissions.js';

export const adminMonitoring = {
  async monitoring() {
    const since = new Date(Date.now() - 30 * 86400_000);
    const [calls, analyses, jobs, cacheEntries, snapshots, latestSnapshot, latestCalls, heartbeats, pendingDeletions] = await Promise.all([
      AiUsage.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$status', count: { $sum: 1 }, averageLatencyMs: { $avg: '$latencyMs' } } }]),
      ContentAnalysis.countDocuments(), DeepAnalysisJob.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      AiCache.countDocuments({ expiresAt: { $gt: new Date() } }), Analytics.countDocuments(), Analytics.findOne().sort({ updatedAt: -1 }).select('platform date updatedAt').lean(),
      AiUsage.find().sort({ createdAt: -1 }).limit(25).select('-__v').lean(),
      WorkerHeartbeat.aggregate<{ _id: string; lastSucceededAt: Date; instances: number }>([{ $group: { _id: '$task', lastSucceededAt: { $max: '$lastSucceededAt' }, instances: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      AccountDeletion.aggregate<{ count: number; oldest: Date }>([{ $match: { status: { $ne: 'complete' } } }, { $group: { _id: null, count: { $sum: 1 }, oldest: { $min: '$createdAt' } } }]),
    ]);
    const workers = {
      tasks: heartbeats.map((h) => ({ task: h._id, lastSucceededAt: h.lastSucceededAt, instances: h.instances })),
      pendingAccountCleanups: pendingDeletions[0]?.count ?? 0, oldestPendingCleanupAt: pendingDeletions[0]?.oldest ?? null,
      note: 'Last successful iteration per background task across all instances (24-hour retention). A missing or old task means no worker is running it. This is not an external alert.',
    };
    return { generatedAt: new Date(), workers, ai: { configured: aiAvailable(), model: aiModel(), windowStart: since, calls, analyses, jobs, cacheEntries, latestCalls, tokens: null, cost: null, note: 'Call telemetry begins with this release; retained for 90 days. Counts include failed generation attempts. Token usage and billing costs are not recorded.' }, analytics: { snapshots, latestSnapshot }, billing: { subscriptionsImplemented: false, chargingEnabled: false, creditRules: null } };
  },
  async errors() {
    const [server, sync, analysis, deep] = await Promise.all([
      SystemError.find().sort({ createdAt: -1 }).limit(50).select('-__v').lean(),
      SyncRun.find({ status: { $in: ['failed', 'partial'] } }).sort({ queuedAt: -1 }).limit(50).select('platform status queuedAt errorKind itemsFailed').lean(),
      ContentAnalysis.find({ lastErrorAt: { $ne: null } }).sort({ lastErrorAt: -1 }).limit(50).select('platform analysisType lastErrorAt attempts').lean(),
      DeepAnalysisJob.find({ status: 'failed' }).sort({ updatedAt: -1 }).limit(50).select('status updatedAt attempts').lean(),
    ]);
    return { server, sync, analysis, deep, note: 'Latest 50 records per source. Server errors are retained for 30 days starting with this release. Provider payloads and error messages are excluded to protect credentials and media URLs.' };
  },
  permissions() {
    return permissionCatalogue();
  },
};
