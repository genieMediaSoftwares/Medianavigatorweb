import { Schema, model, type Types } from 'mongoose';

export interface PlannedContentDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  day: string;
  time: string;
  platform: string;
  contentType: string;
  title: string;
  status: string;
  isRecommended: boolean;
  recommendationReason?: string;
  createdAt: Date;
}

const schema = new Schema<PlannedContentDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: String, required: true, maxlength: 20 },
    time: { type: String, required: true, maxlength: 20 },
    platform: { type: String, required: true, maxlength: 20 },
    contentType: { type: String, required: true, maxlength: 30 },
    title: { type: String, required: true, maxlength: 300 },
    status: { type: String, default: 'scheduled', maxlength: 30 },
    isRecommended: { type: Boolean, default: false },
    recommendationReason: { type: String, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ userId: 1, createdAt: -1 });

export const PlannedContentModel = model<PlannedContentDoc>('PlannedContent', schema);
