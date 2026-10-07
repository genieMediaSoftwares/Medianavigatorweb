import bcrypt from 'bcryptjs';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { unauthorized } from '../lib/errors.js';
import { userService } from '../services/user.service.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { toObjectId } from '../lib/ids.js';
import { Session } from '../models/Session.js';

export const usersController = {
  me: asyncHandler(async (req, res) => ok(res, await userService.me(req.auth!.userId))),
  updateProfile: asyncHandler(async (req, res) => ok(res, { profile: await userService.updateProfile(req.auth!.userId, req.body) })),
  sessions: asyncHandler(async (req, res) => ok(res, { sessions: await userService.listSessions(req.auth!.userId, req.auth!.sessionId) })),
  revokeSession: asyncHandler(async (req, res) => {
    // Ownership is part of the filter: a user can only revoke their own sessions.
    await Session.updateOne({ _id: toObjectId(req.params.id), userId: toObjectId(req.auth!.userId), revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: 'revoked_by_user' } });
    void sessionRepository;
    ok(res, { revoked: true });
  }),
  deleteAccount: asyncHandler(async (req, res) => {
    const user = await userRepository.findByIdWithPassword(req.auth!.userId);
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw unauthorized('Password is incorrect');
    await userService.deleteAccount(req.auth!.userId);
    ok(res, { deleted: true });
  }),
};
