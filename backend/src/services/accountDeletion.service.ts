import { randomUUID } from 'node:crypto';
import { AccountDeletion, type AccountDeletionDoc } from '../models/AccountDeletion.js';
import { User } from '../models/User.js';
import { FileModel } from '../models/File.js';
import { Session } from '../models/Session.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { OAuthState } from '../models/OAuthState.js';
import { ConnectedAccount } from '../models/ConnectedAccount.js';
import { SyncRun } from '../models/SyncRun.js';
import { ContentAnalysis } from '../models/ContentAnalysis.js';
import { DeepAnalysisJob, SavedDeepAction } from '../models/DeepAnalysisJob.js';
import { ContentItem } from '../models/ContentItem.js';
import { Analytics } from '../models/Analytics.js';
import { Notification } from '../models/Notification.js';
import { PlannedContentModel } from '../models/PlannedContent.js';
import { Profile } from '../models/Profile.js';
import { AiCache } from '../models/AiCache.js';
import { toObjectId } from '../lib/ids.js';
import { randomToken } from '../lib/crypto.js';
import { deleteObject, storageEnabled } from '../lib/storage.js';
import { conflict, notFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { isSuperAdmin } from '../../../shared/admin.js';

export const accountDeletion = {
  async request(userId: string) {
    const user = await User.findById(toObjectId(userId)).lean();
    if (!user) throw notFound('User not found');
    if (!user.deletedAt && isSuperAdmin(user.role) && await User.countDocuments({ role: { $in: ['admin', 'super_admin'] }, status: 'active', deletedAt: null }) <= 1) {
      throw conflict('Assign another administrator before deleting this account.');
    }
    // Intent is persisted before access is revoked or any file/data is removed.
    await AccountDeletion.updateOne({ userId: user._id }, { $setOnInsert: { userId: user._id, status: 'queued', nextAttemptAt: new Date() } }, { upsert: true });
    await this.runOne(userId);
    const job = await AccountDeletion.findOne({ userId: user._id }).lean();
    return { deleted: true, cleanupPending: job?.status !== 'complete' };
  },

  async runOne(userId?: string): Promise<boolean> {
    const now = new Date(), owner = randomUUID();
    const job = await AccountDeletion.findOneAndUpdate({
      ...(userId ? { userId: toObjectId(userId) } : {}),
      $or: [{ status: 'queued', nextAttemptAt: { $lte: now } }, { status: 'processing', leaseExpiresAt: { $lte: now } }],
    }, { $set: { status: 'processing', leaseOwner: owner, leaseExpiresAt: new Date(Date.now() + 60_000) }, $inc: { attempts: 1 } }, { sort: { nextAttemptAt: 1 }, new: true, lean: true }).lean<AccountDeletionDoc>();
    if (!job) return false;
    const filter = { _id: job._id, status: 'processing', leaseOwner: owner };
    const heartbeat = setInterval(() => { void AccountDeletion.updateOne(filter, { $set: { leaseExpiresAt: new Date(Date.now() + 60_000) } }).catch(() => undefined); }, 15_000);
    heartbeat.unref();
    try {
      const id = job.userId;
      // Disable immediately, including in-flight refresh attempts. Keep only an anonymized tombstone.
      await User.updateOne({ _id: id }, { $set: { status: 'disabled', email: `deleted+${id}@deleted.invalid`, passwordHash: `!${randomToken(24)}`, mfa: { enabled: false } } });
      await User.updateOne({ _id: id, deletedAt: null }, { $set: { deletedAt: now } }); // first attempt's time survives retries
      await Session.deleteMany({ userId: id });
      await PasswordReset.deleteMany({ userId: id });
      await OAuthState.deleteMany({ userId: id });
      await ConnectedAccount.updateMany({ userId: id }, { $set: { active: false, status: 'disconnected', credentialsEnc: null, nextSyncAt: null } });
      await SyncRun.updateMany({ userId: id, active: true }, { $set: { status: 'cancelled', completedAt: now }, $unset: { active: '' } });
      await DeepAnalysisJob.updateMany({ userId: id, status: { $in: ['queued', 'processing'] } }, { $set: { status: 'cancelled', leaseOwner: null, leaseExpiresAt: null } });
      // Personal data goes first so a storage outage cannot hold it back. Every operation is idempotent;
      // a DB failure leaves the intent pending for the next worker.
      await Promise.all([
        ContentItem.deleteMany({ userId: id }), Analytics.deleteMany({ userId: id }), Notification.deleteMany({ userId: id }),
        PlannedContentModel.deleteMany({ userId: id }), Profile.deleteMany({ userId: id }), AiCache.deleteMany({ userId: id }),
        ConnectedAccount.deleteMany({ userId: id }), ContentAnalysis.deleteMany({ userId: id }),
        DeepAnalysisJob.deleteMany({ userId: id }), SavedDeepAction.deleteMany({ userId: id }),
        FileModel.updateMany({ userId: id }, { $set: { originalName: 'deleted' } }),
      ]);
      // File metadata IS the retry record. Remove it only after the idempotent object delete succeeds.
      // One failing object must not stop the others; any leftover keeps the intent queued.
      let leftover = 0;
      for await (const file of FileModel.find({ userId: id }).select('key status').cursor()) {
        const lease = await AccountDeletion.updateOne(filter, { $set: { leaseExpiresAt: new Date(Date.now() + 60_000) } });
        if (!lease.matchedCount) throw new Error('cleanup lease lost');
        try {
          if (file.status !== 'deleted') {
            if (!storageEnabled()) throw new Error('storage unavailable');
            await deleteObject(file.key);
          }
          await FileModel.deleteOne({ _id: file._id, userId: id });
        } catch { leftover++; }
      }
      if (leftover) throw new Error(`${leftover} stored file(s) not yet removed`);
      await AccountDeletion.updateOne(filter, { $set: { status: 'complete', completedAt: new Date(), lastError: null, leaseOwner: null, leaseExpiresAt: null } });
    } catch {
      logger.warn('account cleanup pending; will retry', { operation: 'account_cleanup', jobId: String(job._id) });
      await AccountDeletion.updateOne(filter, { $set: { status: 'queued', lastError: 'Cleanup interrupted; retry scheduled.', nextAttemptAt: new Date(Date.now() + Math.min(3600_000, 1000 * 2 ** Math.min(job.attempts, 12))), leaseOwner: null, leaseExpiresAt: null } });
    } finally { clearInterval(heartbeat); }
    return true;
  },
};
