import { Schema, model, type Types } from 'mongoose';
import type { Role } from '../types/auth.js';
import { ROLES } from '../../../shared/admin.js';

export interface UserDoc {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: Role;
  status: 'active' | 'disabled';
  failedLoginCount: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  passwordChangedAt?: Date | null;
  deletedAt?: Date | null;
  credits?: number;
  freeTopChecksRemaining?: number;
  freeBottomChecksRemaining?: number;
  /** Staff two-step sign-in. Secrets are AES-GCM encrypted with the credential key; recovery codes are SHA-256 hashes. */
  mfa?: { enabled: boolean; secretEnc?: string | null; pendingSecretEnc?: string | null; enabledAt?: Date | null; lastUsedStep?: number | null; recoveryCodeHashes?: string[] };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'user', required: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', required: true },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  credits: { type: Number, default: 50, min: 0 },
  freeTopChecksRemaining: { type: Number, default: 5, min: 0 },
  freeBottomChecksRemaining: { type: Number, default: 5, min: 0 },
    mfa: {
      enabled: { type: Boolean, default: false },
      secretEnc: { type: String, default: null, select: false },
      pendingSecretEnc: { type: String, default: null, select: false },
      enabledAt: { type: Date, default: null },
      lastUsedStep: { type: Number, default: null },
      recoveryCodeHashes: { type: [String], default: undefined, select: false },
    },
  },
  { timestamps: true },
);
schema.index({ email: 1 }, { unique: true });
schema.index({ createdAt: -1 });
schema.index({ role: 1, status: 1 });

export const User = model<UserDoc>('User', schema);
