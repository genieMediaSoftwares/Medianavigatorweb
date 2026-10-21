import { Schema, model, type Types } from 'mongoose';
import type { DeepAnalysisV2, DeepAnalysisState } from '../../../shared/deepAnalysisV2.js';
export interface DeepJobDoc {
  _id: Types.ObjectId; userId: Types.ObjectId; postId: string; accountId: Types.ObjectId; fingerprint: string; version: string; goal: string;
  status: DeepAnalysisState['status']; progress: DeepAnalysisState['progress']; report: DeepAnalysisV2 | null; error: string | null;
  attempts: number; leaseOwner: string | null; leaseExpiresAt: Date | null; createdAt: Date; updatedAt: Date;
}
const schema = new Schema<DeepJobDoc>({
  userId: { type: Schema.Types.ObjectId, required: true }, postId: { type: String, required: true }, accountId: { type: Schema.Types.ObjectId, required: true }, fingerprint: { type: String, required: true }, version: { type: String, required: true }, goal: { type: String, required: true },
  status: { type: String, enum: ['queued', 'processing', 'complete', 'partial', 'failed', 'cancelled'], required: true }, progress: { type: Schema.Types.Mixed, required: true }, report: { type: Schema.Types.Mixed, default: null }, error: { type: String, default: null }, attempts: { type: Number, default: 0 }, leaseOwner: { type: String, default: null }, leaseExpiresAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ userId: 1, postId: 1, version: 1, fingerprint: 1 }, { unique: true });
schema.index({ status: 1, leaseExpiresAt: 1, createdAt: 1 });
export const DeepAnalysisJob = model<DeepJobDoc>('DeepAnalysisJob', schema);

const savedSchema = new Schema({ userId: { type: Schema.Types.ObjectId, required: true }, postId: { type: String, required: true }, jobId: { type: Schema.Types.ObjectId, required: true }, actionId: { type: String, required: true }, action: { type: Schema.Types.Mixed, required: true } }, { timestamps: true });
savedSchema.index({ userId: 1, jobId: 1, actionId: 1 }, { unique: true });
export const SavedDeepAction = model('SavedDeepAction', savedSchema);
