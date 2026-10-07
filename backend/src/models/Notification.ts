import { Schema, model, type Types } from 'mongoose';

export interface NotificationDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  /** Present for derived alerts so re-computation upserts instead of duplicating. */
  dedupeKey?: string;
  severity: 'info' | 'medium' | 'high';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt?: Date | null;
  createdAt: Date;
}

const schema = new Schema<NotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, maxlength: 60 },
    dedupeKey: { type: String },
    severity: { type: String, enum: ['info', 'medium', 'high'], default: 'info' },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 2000 },
    data: { type: Schema.Types.Mixed },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, readAt: 1, createdAt: -1 });
schema.index({ userId: 1, dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });

export const Notification = model<NotificationDoc>('Notification', schema);
