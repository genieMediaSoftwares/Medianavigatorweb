import { Schema, model } from 'mongoose';

export interface RateLimitDoc { _id: string; count: number; expiresAt: Date }

/** One counter per (limiter, client) window. Shared by every API instance; expired windows are removed by a TTL index. */
const schema = new Schema<RateLimitDoc>({
  _id: { type: String },
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit = model<RateLimitDoc>('RateLimit', schema);
