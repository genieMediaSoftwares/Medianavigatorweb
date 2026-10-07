import { Schema, model, type Types } from 'mongoose';

export interface PasswordResetDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}

const schema = new Schema<PasswordResetDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
});
schema.index({ tokenHash: 1 }, { unique: true });
schema.index({ userId: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = model<PasswordResetDoc>('PasswordReset', schema);
