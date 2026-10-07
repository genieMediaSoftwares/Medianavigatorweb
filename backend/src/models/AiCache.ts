import { Schema, model, type Types } from 'mongoose';

export interface AiCacheDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  cacheKey: string;
  analysisType: string;
  payload: unknown;
  model: string;
  promptVersion: string;
  dataVersion: string;
  generatedAt: Date;
  expiresAt: Date;
}

const schema = new Schema<AiCacheDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cacheKey: { type: String, required: true },
  analysisType: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  model: { type: String, required: true },
  promptVersion: { type: String, required: true },
  dataVersion: { type: String, required: true },
  generatedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});
schema.index({ userId: 1, cacheKey: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AiCache = model<AiCacheDoc>('AiCache', schema);
