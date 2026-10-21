import { AiUsage, SystemError } from '../models/AdminTelemetry.js';
import { AiCache } from '../models/AiCache.js';
import { ContentAnalysis } from '../models/ContentAnalysis.js';
import { DeepAnalysisJob } from '../models/DeepAnalysisJob.js';
import { Analytics } from '../models/Analytics.js';
import { SyncRun } from '../models/SyncRun.js';
import { aiAvailable, aiModel } from './ai/geminiClient.js';
import { CREDIT_RULES } from './credits.service.js';

export const adminMonitoring = {
  async monitoring() {
    const since = new Date(Date.now() - 30 * 86400_000);
    const [calls, analyses, jobs, cacheEntries, snapshots, latestSnapshot, latestCalls] = await Promise.all([
      AiUsage.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$status', count: { $sum: 1 }, averageLatencyMs: { $avg: '$latencyMs' } } }]),
      ContentAnalysis.countDocuments(), DeepAnalysisJob.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      AiCache.countDocuments({ expiresAt: { $gt: new Date() } }), Analytics.countDocuments(), Analytics.findOne().sort({ updatedAt: -1 }).select('platform date updatedAt').lean(),
      AiUsage.find().sort({ createdAt: -1 }).limit(25).select('-__v').lean(),
    ]);
    return { generatedAt: new Date(), ai: { configured: aiAvailable(), model: aiModel(), windowStart: since, calls, analyses, jobs, cacheEntries, latestCalls, tokens: null, cost: null, note: 'Call telemetry begins with this release; retained for 90 days. Counts include failed generation attempts. Token usage and billing costs are not recorded.' }, analytics: { snapshots, latestSnapshot }, billing: { subscriptionsImplemented: false, creditRules: CREDIT_RULES } };
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
    return { roles: [
      { role: 'user', permissions: ['Manage own profile, connections, content and analyses'], adminAccess: false },
      { role: 'admin', permissions: ['View system health, analytics, AI usage, errors and audit history', 'Manage user status and credits', 'Grant and revoke administrator access', 'Inspect all social connections and trigger existing sync jobs'], adminAccess: true },
    ], safeguards: ['Database role and active session checked on every admin API request', 'Self role/status changes are forbidden', 'Last administrator cannot be removed or disabled', 'Account disabling revokes sessions', 'Administrative mutations are audited'] };
  },
};
