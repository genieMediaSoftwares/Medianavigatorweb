import { Schema, model, type Types } from 'mongoose';
import type { PlatformType } from '../../../shared/types.js';

export interface OAuthStateDoc {
  _id: Types.ObjectId;
  stateHash: string;
  userId: Types.ObjectId;
  platform: PlatformType;
  codeVerifierEnc?: string;
  expiresAt: Date;
  consumedAt?: Date | null;
}

const schema = new Schema<OAuthStateDoc>({
  stateHash: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { type: String, enum: ['instagram', 'facebook', 'youtube', 'linkedin'], required: true },
  codeVerifierEnc: { type: String },
  expiresAt: { type: Date, required: true },
  consumedAt: { type: Date, default: null },
});
schema.index({ stateHash: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthState = model<OAuthStateDoc>('OAuthState', schema);
