import { Schema, model, type Types } from 'mongoose';

export interface ChecklistItemDoc { id: string; label: string; done: boolean }

/** Where a plan's idea came from: one recommendation of a saved content analysis. Only a short excerpt is copied. */
export interface PlanSourceDoc {
  mediaId: string;
  analysisType: 'deep' | 'why_top' | 'why_bottom';
  analysisId: Types.ObjectId;
  recommendationIndex: number;
  recommendationText: string;
  analysisSummary: string;
  platform: string;
}

/**
 * The published post a plan became. `verification`: 'matched' = linked to a post Media Navigator synced from the
 * platform (confirmed by the user or by its exact permalink); 'manual' = the user said it was published, unverified.
 */
export interface PlanPublicationDoc {
  verification: 'matched' | 'manual';
  mediaId?: string | null;
  url?: string | null;
  publishedAt: Date;
  confirmedAt: Date;
}

/**
 * A content plan. Plans made before Planner V2 only have `day` + `time` (a weekday and "6:00 PM"); they are kept as
 * they are and shown as "needs a date" until the user picks one. No calendar date is ever invented for them.
 */
export interface PlannedContentDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Legacy weekday + 12-hour time. Filled for dated V2 plans too, so older clients keep working. */
  day?: string | null;
  time?: string | null;
  platform: string;
  /** Legacy free-text format; V2 plans also set `format`. */
  contentType: string;
  format?: string | null;
  title: string;
  description?: string;
  caption?: string;
  cta?: string;
  referenceUrl?: string;
  notes?: string;
  goal?: string | null;
  status: string;
  /** The planned instant (UTC). Null for ideas and for legacy plans that only have a weekday. */
  scheduledAt?: Date | null;
  /** IANA timezone the plan was made in, and the wall-clock date/time the user chose there. */
  timezone?: string | null;
  localDate?: string | null;
  localTime?: string | null;
  checklist?: ChecklistItemDoc[];
  /** Minutes before `scheduledAt`. */
  reminders?: number[];
  /** Reminder keys already delivered (see plans.reminderKey). */
  remindersSent?: string[];
  /** Plans created together for several platforms share one group id. */
  groupId?: string | null;
  connectedAccountId?: Types.ObjectId | null;
  source?: PlanSourceDoc | null;
  publication?: PlanPublicationDoc | null;
  isRecommended: boolean;
  recommendationReason?: string;
  createdAt: Date;
  updatedAt?: Date;
}

const schema = new Schema<PlannedContentDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: String, default: null, maxlength: 20 },
    time: { type: String, default: null, maxlength: 20 },
    platform: { type: String, required: true, maxlength: 20 },
    contentType: { type: String, required: true, maxlength: 30 },
    format: { type: String, default: null, maxlength: 20 },
    title: { type: String, required: true, maxlength: 300 },
    description: { type: String, maxlength: 2000 },
    caption: { type: String, maxlength: 5000 },
    cta: { type: String, maxlength: 300 },
    referenceUrl: { type: String, maxlength: 1000 },
    notes: { type: String, maxlength: 2000 },
    goal: { type: String, default: null, maxlength: 30 },
    status: { type: String, default: 'planned', maxlength: 30 },
    scheduledAt: { type: Date, default: null },
    timezone: { type: String, default: null, maxlength: 64 },
    localDate: { type: String, default: null, maxlength: 10 },
    localTime: { type: String, default: null, maxlength: 5 },
    checklist: { type: [{ _id: false, id: { type: String, required: true }, label: { type: String, required: true, maxlength: 120 }, done: { type: Boolean, default: false } }], default: undefined },
    reminders: { type: [Number], default: undefined },
    remindersSent: { type: [String], default: undefined },
    groupId: { type: String, default: null },
    connectedAccountId: { type: Schema.Types.ObjectId, ref: 'ConnectedAccount', default: null },
    source: {
      type: new Schema<PlanSourceDoc>({
        mediaId: { type: String, required: true },
        analysisType: { type: String, required: true },
        analysisId: { type: Schema.Types.ObjectId, required: true },
        recommendationIndex: { type: Number, required: true },
        recommendationText: { type: String, required: true, maxlength: 400 },
        analysisSummary: { type: String, default: '', maxlength: 600 },
        platform: { type: String, required: true },
      }, { _id: false }),
      default: null,
    },
    publication: {
      type: new Schema<PlanPublicationDoc>({
        verification: { type: String, enum: ['matched', 'manual'], required: true },
        mediaId: { type: String, default: null },
        url: { type: String, default: null, maxlength: 1000 },
        publishedAt: { type: Date, required: true },
        confirmedAt: { type: Date, required: true },
      }, { _id: false }),
      default: null,
    },
    isRecommended: { type: Boolean, default: false },
    recommendationReason: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);
schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, scheduledAt: 1 });
schema.index({ userId: 1, groupId: 1 });
// The reminder job scans upcoming dated plans by time.
schema.index({ status: 1, scheduledAt: 1 });
// One synced post can be claimed by only one plan.
schema.index({ userId: 1, 'publication.mediaId': 1 }, { unique: true, partialFilterExpression: { 'publication.mediaId': { $type: 'string' } } });

export const PlannedContentModel = model<PlannedContentDoc>('PlannedContent', schema);
