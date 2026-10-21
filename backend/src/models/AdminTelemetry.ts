import { Schema, model } from 'mongoose';

// Metadata only: never persist prompts, provider responses, cookies or tokens.
const usageSchema = new Schema({
  operation: { type: String, required: true }, model: { type: String, required: true },
  status: { type: String, enum: ['succeeded', 'failed'], required: true },
  latencyMs: { type: Number, required: true }, reason: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, expires: 90 * 86400 },
});
usageSchema.index({ createdAt: -1 });
export const AiUsage = model('AiUsage', usageSchema);

const errorSchema = new Schema({
  code: { type: String, required: true }, status: { type: Number, required: true },
  method: { type: String, required: true }, route: { type: String, required: true },
  requestId: { type: String }, createdAt: { type: Date, default: Date.now, expires: 30 * 86400 },
});
errorSchema.index({ createdAt: -1 });
export const SystemError = model('SystemError', errorSchema);
