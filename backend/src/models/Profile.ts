import { Schema, model, type Types } from 'mongoose';

export interface ProfileDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  fullName: string;
  organization?: string;
  accountType?: string;
  timezone?: string;
  avatarFileId?: Types.ObjectId | null;
  onboardingCompleted: boolean;
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
  },
  { timestamps: true },
);
schema.index({ userId: 1 }, { unique: true });

export const Profile = model<ProfileDoc>('Profile', schema);
