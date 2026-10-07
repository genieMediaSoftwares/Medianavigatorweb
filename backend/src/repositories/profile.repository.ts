import type { Types } from 'mongoose';
import { Profile, type ProfileDoc } from '../models/Profile.js';

export const profileRepository = {
  findByUserId: (userId: Types.ObjectId | string) => Profile.findOne({ userId }).lean<ProfileDoc>(),
  upsert: (userId: Types.ObjectId, data: Partial<Pick<ProfileDoc, 'fullName' | 'organization' | 'accountType' | 'timezone' | 'onboardingCompleted' | 'avatarFileId'>>) =>
    Profile.findOneAndUpdate({ userId }, { $set: data, $setOnInsert: { userId } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean<ProfileDoc>(),
  deleteByUserId: (userId: Types.ObjectId) => Profile.deleteOne({ userId }),
};
