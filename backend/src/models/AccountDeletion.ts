import { Schema, model, type Types } from 'mongoose';

/** Durable cleanup intent. Contains no email, credentials, file names or object keys. */
export interface AccountDeletionDoc {
  _id: Types.ObjectId; userId: Types.ObjectId;
  status: 'queued' | 'processing' | 'complete'; attempts: number;
  leaseOwner: string | null; leaseExpiresAt: Date | null; nextAttemptAt: Date;
  lastError: string | null; completedAt: Date | null; createdAt: Date; updatedAt: Date;
}
const schema = new Schema<AccountDeletionDoc>({
  userId: { type: Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ['queued', 'processing', 'complete'], default: 'queued' },
  attempts: { type: Number, default: 0 }, leaseOwner: { type: String, default: null }, leaseExpiresAt: { type: Date, default: null },
  nextAttemptAt: { type: Date, default: Date.now }, lastError: { type: String, default: null }, completedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ userId: 1 }, { unique: true });
schema.index({ status: 1, nextAttemptAt: 1, leaseExpiresAt: 1 });
export const AccountDeletion = model<AccountDeletionDoc>('AccountDeletion', schema);
