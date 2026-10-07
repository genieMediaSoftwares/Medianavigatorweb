import type { Types } from 'mongoose';
import { OAuthState, type OAuthStateDoc } from '../models/OAuthState.js';
import type { PlatformType } from '../../../shared/types.js';

export const oauthStateRepository = {
  create: (data: { stateHash: string; userId: Types.ObjectId; platform: PlatformType; codeVerifierEnc?: string; expiresAt: Date }) => OAuthState.create(data),
  /** Single-use: atomically marks the state consumed; returns null when missing, expired or already used. */
  consume: (stateHash: string) =>
    OAuthState.findOneAndUpdate({ stateHash, consumedAt: null, expiresAt: { $gt: new Date() } }, { $set: { consumedAt: new Date() } }, { new: true }).lean<OAuthStateDoc>(),
};
