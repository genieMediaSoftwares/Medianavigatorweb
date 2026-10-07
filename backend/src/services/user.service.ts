import { randomToken } from '../lib/crypto.js';
import { notFound } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import { logger } from '../lib/logger.js';
import { userRepository } from '../repositories/user.repository.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { connectionRepository } from '../repositories/connection.repository.js';
import { mediaRepository } from '../repositories/media.repository.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { fileRepository } from '../repositories/file.repository.js';
import { plannedRepository } from '../repositories/planned.repository.js';
import { aiCacheRepository } from '../repositories/aiCache.repository.js';
import { SyncRun } from '../models/SyncRun.js';
import { ConnectedAccount } from '../models/ConnectedAccount.js';
import { deleteObject, storageEnabled } from '../lib/storage.js';
import { publicUser } from './auth.service.js';

import type { ProfileDoc } from '../models/Profile.js';

export const profileView = (p: ProfileDoc | null) =>
  p ? { fullName: p.fullName, organization: p.organization ?? null, accountType: p.accountType ?? null, timezone: p.timezone ?? null, avatarFileId: p.avatarFileId ? String(p.avatarFileId) : null, onboardingCompleted: p.onboardingCompleted } : null;

export const userService = {
  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw notFound('User not found');
    const profile = await profileRepository.findByUserId(user._id);
    return { user: publicUser(user), profile: profileView(profile) };
  },

  async updateProfile(userId: string, data: { fullName?: string; organization?: string; accountType?: string; timezone?: string; onboardingCompleted?: boolean }) {
    return profileView(await profileRepository.upsert(toObjectId(userId), data));
  },

  listSessions: async (userId: string, currentSessionId: string) =>
    (await sessionRepository.listForUser(userId)).map((s) => ({
      id: String(s._id), current: String(s._id) === currentSessionId, userAgent: s.userAgent ?? null, ip: s.ip ?? null, lastUsedAt: s.lastUsedAt, createdAt: s.createdAt,
    })),

  /**
   * Account deletion: credentials are wiped and all user-owned data removed. The user row is kept only as an anonymized
   * tombstone (no email, no password) so audit references stay valid. Only data owned by this user id is touched.
   */
  async deleteAccount(userId: string) {
    const id = toObjectId(userId);
    const user = await userRepository.findById(id);
    if (!user) throw notFound('User not found');

    await sessionRepository.revokeAllForUser(id, 'account_deleted');
    await ConnectedAccount.updateMany({ userId: id }, { $set: { active: false, status: 'disconnected', credentialsEnc: null, disconnectedAt: new Date(), nextSyncAt: null } });
    await SyncRun.updateMany({ userId: id, active: true }, { $set: { status: 'cancelled', completedAt: new Date() }, $unset: { active: '' } });

    if (storageEnabled()) {
      for (const f of await fileRepository.listAllKeysForUser(id)) {
        try { await deleteObject(f.key); } catch (err) { logger.warn('could not delete stored file during account deletion', { error: err }); }
      }
    }
    await Promise.all([
      mediaRepository.deleteAllForUser(id), analyticsRepository.deleteAllForUser(id), notificationRepository.deleteAllForUser(id),
      fileRepository.deleteAllForUser(id), plannedRepository.deleteAllForUser(id), aiCacheRepository.deleteAllForUser(id), profileRepository.deleteByUserId(id),
      ConnectedAccount.deleteMany({ userId: id }),
    ]);
    await userRepository.markDeleted(id, `deleted+${String(id)}@deleted.invalid`);
    await userRepository.setPassword(id, `!${randomToken(24)}`); // unusable hash
  },
};
export { connectionRepository };
