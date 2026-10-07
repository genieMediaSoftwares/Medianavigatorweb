import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { badRequest, conflict, unauthorized, unavailable, AppError } from '../lib/errors.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { signAccessToken } from '../lib/jwt.js';
import { logger } from '../lib/logger.js';
import { userRepository } from '../repositories/user.repository.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { passwordResetRepository } from '../repositories/passwordReset.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { emailEnabled, sendPasswordResetEmail } from './email.service.js';
import { profileView } from './user.service.js';
import type { UserDoc } from '../models/User.js';

export interface ClientInfo { userAgent?: string; ip?: string }

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
}

// Used to keep login timing constant when the email does not exist (prevents account enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 10);

const hash = (pw: string) => bcrypt.hash(pw, config.auth.passwordHashRounds);

async function issueSession(user: Pick<UserDoc, '_id' | 'role'>, client: ClientInfo): Promise<TokenPair> {
  const refreshToken = randomToken(48);
  const expiresAt = new Date(Date.now() + config.auth.refreshTtlSeconds * 1000);
  const session = await sessionRepository.create({ userId: user._id, refreshTokenHash: sha256(refreshToken), expiresAt, userAgent: client.userAgent?.slice(0, 300), ip: client.ip });
  await sessionRepository.enforceLimit(user._id, config.auth.maxSessionsPerUser);
  return {
    accessToken: signAccessToken({ sub: String(user._id), sessionId: String(session._id), role: user.role }),
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: config.auth.accessTtlSeconds,
    refreshExpiresIn: config.auth.refreshTtlSeconds,
  };
}

export const publicUser = (u: Pick<UserDoc, '_id' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt'>) => ({
  id: String(u._id), email: u.email, role: u.role, status: u.status, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt ?? null,
});

export const authService = {
  async register(input: { email: string; password: string; fullName: string; organization?: string; accountType?: string }, client: ClientInfo) {
    const email = input.email.toLowerCase();
    if (await userRepository.findByEmail(email)) throw conflict('An account with this email already exists');
    let user: UserDoc;
    try {
      user = await userRepository.create({ email, passwordHash: await hash(input.password), role: 'user' });
    } catch (err: any) {
      if (err?.code === 11000) throw conflict('An account with this email already exists');
      throw err;
    }
    const profile = await profileRepository.upsert(user._id, { fullName: input.fullName, organization: input.organization, accountType: input.accountType });
    const tokens = await issueSession(user, client);
    return { user: publicUser(user), profile: profileView(profile), tokens };
  },

  async login(input: { email: string; password: string }, client: ClientInfo) {
    const user = await userRepository.findByEmailWithPassword(input.email);
    const locked = user?.lockedUntil && user.lockedUntil.getTime() > Date.now();
    // Always run one bcrypt comparison so response time does not reveal whether the email exists.
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || user.deletedAt) throw unauthorized('Invalid email or password');
    if (locked) throw new AppError('RATE_LIMITED', 'Too many failed attempts. Try again later.');
    if (!ok) {
      await userRepository.registerLoginFailure(user._id, config.auth.maxFailedLogins, config.auth.lockoutMinutes);
      throw unauthorized('Invalid email or password');
    }
    if (user.status !== 'active') throw unauthorized('This account is disabled');
    await userRepository.registerLoginSuccess(user._id);
    const tokens = await issueSession(user, client);
    if (user.role === 'admin') await auditRepository.record({ actorId: user._id, action: 'admin.login', ip: client.ip });
    return { user: publicUser(user), tokens };
  },

  /**
   * Rotates the refresh token. Presenting an already-rotated token means it was stolen or replayed, so the whole
   * session is revoked and the client must log in again.
   */
  async refresh(refreshToken: string, client: ClientInfo): Promise<TokenPair> {
    const h = sha256(refreshToken);
    const session = await sessionRepository.findByRefreshHash(h);
    if (!session) throw unauthorized('Invalid refresh token');
    if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) throw unauthorized('Session expired');
    if (session.refreshTokenHash !== h) {
      await sessionRepository.revoke(session._id, 'refresh_token_reuse');
      logger.warn('refresh token reuse detected; session revoked', { sessionId: String(session._id) });
      throw unauthorized('Invalid refresh token');
    }
    const user = await userRepository.findById(session.userId);
    if (!user || user.status !== 'active' || user.deletedAt) throw unauthorized('Account is not active');

    const next = randomToken(48);
    const expiresAt = new Date(Date.now() + config.auth.refreshTtlSeconds * 1000);
    const rotated = await sessionRepository.rotate(session._id, h, sha256(next), expiresAt);
    if (!rotated) throw unauthorized('Invalid refresh token'); // lost a race with a concurrent refresh
    return {
      accessToken: signAccessToken({ sub: String(user._id), sessionId: String(session._id), role: user.role }),
      refreshToken: next,
      tokenType: 'Bearer',
      expiresIn: config.auth.accessTtlSeconds,
      refreshExpiresIn: config.auth.refreshTtlSeconds,
    };
  },

  logout: (sessionId: string) => sessionRepository.revoke(sessionId, 'logout'),
  logoutAll: (userId: string) => sessionRepository.revokeAllForUser(userId, 'logout_all'),

  async changePassword(userId: string, sessionId: string, current: string, next: string) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !(await bcrypt.compare(current, user.passwordHash))) throw unauthorized('Current password is incorrect');
    if (current === next) throw badRequest('New password must be different from the current password');
    await userRepository.setPassword(user._id, await hash(next));
    // Keep this device signed in; every other session must re-authenticate.
    await sessionRepository.revokeAllForUser(user._id, 'password_changed', sessionId);
  },

  /**
   * Always answers the same way for known and unknown emails. When email delivery is not configured the endpoint says
   * so (503) instead of pretending a message was sent.
   */
  async forgotPassword(email: string) {
    if (!emailEnabled()) throw unavailable('Password reset email is not configured on this server');
    const user = await userRepository.findByEmail(email);
    if (!user || user.status !== 'active' || user.deletedAt) return;
    await passwordResetRepository.invalidateForUser(user._id);
    const token = randomToken(32);
    await passwordResetRepository.create(user._id, sha256(token), new Date(Date.now() + config.auth.resetTokenTtlMinutes * 60_000));
    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (err) {
      logger.error('password reset email failed', { error: err });
      throw unavailable('Could not send the reset email right now. Please try again later.');
    }
  },

  async resetPassword(token: string, newPassword: string) {
    const record = await passwordResetRepository.consume(sha256(token));
    if (!record) throw badRequest('This reset link is invalid or has expired');
    await userRepository.setPassword(record.userId, await hash(newPassword));
    await sessionRepository.revokeAllForUser(record.userId, 'password_reset');
  },
};
