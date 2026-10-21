import { Schema, model, type Types } from 'mongoose';

export type ContentAnalysisType = 'deep' | 'why_top' | 'why_bottom' | 'diagnosis';

/**
 * One saved six-point analysis per (user, post, analysis type, analysis version).
 * `result` is only ever replaced by another valid result; a failed refresh records `lastError`
 * and keeps the previous result.
 */
export interface ContentAnalysisDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** The post's id in this app (ContentItem.legacyId, e.g. ig_123). */
  mediaId: string;
  platform: string;
  /** The post's format (reel, post, carousel, …). */
  contentType: string | null;
  analysisType: ContentAnalysisType;
  analysisVersion: string;
  /** Hash of the evidence the result was built from (metrics, caption, media identity). */
  evidenceHash: string | null;
  result: unknown | null;
  /** Measured metrics and comparison used for `result`, as shown to the user. */
  metrics: unknown | null;
  comparison: unknown | null;
  /** What media the model actually received: full_video, uploaded_video, youtube_video, image, carousel_images, thumbnail, none. */
  mediaBasis: string | null;
  model: string | null;
  analyzedAt: Date | null;
  lastError: string | null;
  lastErrorAt: Date | null;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ContentAnalysisDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mediaId: { type: String, required: true },
    platform: { type: String, required: true },
    contentType: { type: String, default: null },
    analysisType: { type: String, enum: ['deep', 'why_top', 'why_bottom', 'diagnosis'], required: true },
    analysisVersion: { type: String, required: true },
    evidenceHash: { type: String, default: null },
    result: { type: Schema.Types.Mixed, default: null },
    metrics: { type: Schema.Types.Mixed, default: null },
    comparison: { type: Schema.Types.Mixed, default: null },
    mediaBasis: { type: String, default: null },
    model: { type: String, default: null },
    analyzedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    lastErrorAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);
schema.index({ userId: 1, mediaId: 1, analysisType: 1, analysisVersion: 1 }, { unique: true });

export const ContentAnalysis = model<ContentAnalysisDoc>('ContentAnalysis', schema);
