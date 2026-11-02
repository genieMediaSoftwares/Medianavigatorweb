import { Schema, model } from 'mongoose';

const schema = new Schema({
  instance: { type: String, required: true }, task: { type: String, required: true },
  lastSucceededAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ instance: 1, task: 1 }, { unique: true });
schema.index({ lastSucceededAt: 1 }, { expireAfterSeconds: 86400 });
export const WorkerHeartbeat = model('WorkerHeartbeat', schema);
