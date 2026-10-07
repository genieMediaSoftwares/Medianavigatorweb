import type { Types } from 'mongoose';
import { PasswordReset, type PasswordResetDoc } from '../models/PasswordReset.js';

export const passwordResetRepository = {
  create: (userId: Types.ObjectId, tokenHash: string, expiresAt: Date) => PasswordReset.create({ userId, tokenHash, expiresAt }),
  invalidateForUser: (userId: Types.ObjectId) => PasswordReset.deleteMany({ userId, usedAt: null }),
  /** Atomically consumes a valid token (single use). */
  consume: (tokenHash: string) =>
    PasswordReset.findOneAndUpdate({ tokenHash, usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { new: true }).lean<PasswordResetDoc>(),
};
