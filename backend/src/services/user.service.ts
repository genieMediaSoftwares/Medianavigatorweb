import { notFound } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import { userRepository } from '../repositories/user.repository.js';
import type { NotificationPrefs } from '../models/Profile.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { connectionRepository } from '../repositories/connection.repository.js';
import { accountDeletion } from './accountDeletion.service.js';
import { publicUser } from './auth.service.js';

import type { ProfileDoc } from '../models/Profile.js';

export const profileView = (p: ProfileDoc | null) =>
  p ? {
    fullName: p.fullName, organization: p.organization ?? null, accountType: p.accountType ?? null, timezone: p.timezone ?? null,
    avatarFileId: p.avatarFileId ? String(p.avatarFileId) : null, onboardingCompleted: p.onboardingCompleted,
    // Profiles created before preferences existed have none stored: every category is on.
    notificationPrefs: {
      syncUpdates: p.notificationPrefs?.syncUpdates ?? true,
      connectionProblems: p.notificationPrefs?.connectionProblems ?? true,
      performanceAlerts: p.notificationPrefs?.performanceAlerts ?? true,
    },
  } : null;

export const userService = {
  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw notFound('User not found');
    const profile = await profileRepository.findByUserId(user._id);
    return { user: publicUser(user), profile: profileView(profile) };
  },

  async updateProfile(userId: string, data: { fullName?: string; organization?: string; accountType?: string; timezone?: string; onboardingCompleted?: boolean; notificationPrefs?: Partial<NotificationPrefs> }) {
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
    return accountDeletion.request(userId);
  },
};
export { connectionRepository };
