import { Schema, model, type Types } from 'mongoose';
import type { InstagramAd as Ad } from '../../../shared/instagramAds.js';
interface InstagramAdDoc {
  userId: Types.ObjectId;
  connectedAccountId: Types.ObjectId;
  instagramAccountId: string;
  adKey: string;
  record: Ad;
}
const schema = new Schema<InstagramAdDoc>({
  userId: { type: Schema.Types.ObjectId, required: true },
  connectedAccountId: { type: Schema.Types.ObjectId, required: true },
  instagramAccountId: { type: String, required: true },
  adKey: { type: String, required: true },
  record: { type: Schema.Types.Mixed, required: true },
});
schema.index({ userId: 1, connectedAccountId: 1, instagramAccountId: 1, adKey: 1 }, { unique: true });
export const InstagramAd = model<InstagramAdDoc>('InstagramAd', schema);
