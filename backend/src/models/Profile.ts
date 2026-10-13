import { Schema, model, type Types } from 'mongoose';

/** Which notification categories the user wants. Every category is on until the user turns it off. */
export interface NotificationPrefs {
  /** "Sync complete" messages after each successful sync. */
  syncUpdates: boolean;
  /** Expired access, failed syncs and missing permissions. */
  connectionProblems: boolean;
  /** Performance alerts derived from synced posts. */
  performanceAlerts: boolean;
}

export const NOTIFICATION_CATEGORIES = ['syncUpdates', 'connectionProblems', 'performanceAlerts'] as const;

export interface ProfileDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  fullName: string;
  organization?: string;
  accountType?: string;
  timezone?: string;
  avatarFileId?: Types.ObjectId | null;
  onboardingCompleted: boolean;
  notificationPrefs?: Partial<NotificationPrefs>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ProfileDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    organization: { type: String, trim: true, maxlength: 160 },
    accountType: { type: String, trim: true, maxlength: 60 },
    timezone: { type: String, trim: true, maxlength: 64 },
    avatarFileId: { type: Schema.Types.ObjectId, ref: 'File', default: null },
    onboardingCompleted: { type: Boolean, default: false },
    notificationPrefs: {
      syncUpdates: { type: Boolean, default: true },
      connectionProblems: { type: Boolean, default: true },
      performanceAlerts: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);
schema.index({ userId: 1 }, { unique: true });

export const Profile = model<ProfileDoc>('Profile', schema);
