import { Schema, model, type Types } from 'mongoose';

export interface SessionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  refreshTokenHash: string;
  previousRefreshTokenHash?: string | null;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  revokedReason?: string;
  lastUsedAt: Date;
  createdAt: Date;
}

const schema = new Schema<SessionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    refreshTokenHash: { type: String, required: true },
    previousRefreshTokenHash: { type: String, default: null },
    userAgent: { type: String, maxlength: 300 },
    ip: { type: String, maxlength: 64 },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, maxlength: 60 },
    lastUsedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ refreshTokenHash: 1 }, { unique: true });
schema.index({ previousRefreshTokenHash: 1 }, { sparse: true });
schema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // purge 30d after expiry

export const Session = model<SessionDoc>('Session', schema);
