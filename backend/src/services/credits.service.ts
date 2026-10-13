import { User, type UserDoc } from '../models/User.js';
import { toObjectId } from '../lib/ids.js';
import { badRequest } from '../lib/errors.js';
import { userRepository } from '../repositories/user.repository.js';

export const CREDIT_RULES = {
  startingBalance: 50,
  postAnalysis: { image: 5, video: 20 },
  freeChecks: { top: 5, bottom: 5 },
} as const;

export const creditService = {
  async balance(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) return 0;
    return user.credits ?? CREDIT_RULES.startingBalance;
  },
  async freeTopRemaining(userId: string) {
    const user = await userRepository.findById(userId);
    return user?.freeTopChecksRemaining ?? CREDIT_RULES.freeChecks.top;
  },
  async freeBottomRemaining(userId: string) {
    const user = await userRepository.findById(userId);
    return user?.freeBottomChecksRemaining ?? CREDIT_RULES.freeChecks.bottom;
  },
  async spend(userId: string, amount: number, _reason?: string) {
    if (!amount || amount <= 0) return;
    const user = await userRepository.findById(userId);
    const current = user?.credits ?? CREDIT_RULES.startingBalance;
    if (current < amount) throw badRequest(`Not enough Insight Credits. This action needs ${amount} and you have ${current}.`);
    await User.updateOne({ _id: toObjectId(userId) }, { $inc: { credits: -amount }, $set: { updatedAt: new Date() } });
  },
  async useFreeTopCheck(userId: string) {
    const user = await userRepository.findById(userId);
    const remaining = user?.freeTopChecksRemaining ?? CREDIT_RULES.freeChecks.top;
    if (remaining <= 0) return false;
    await User.updateOne({ _id: toObjectId(userId) }, { $inc: { freeTopChecksRemaining: -1 }, $set: { updatedAt: new Date() } });
    return true;
  },
  async useFreeBottomCheck(userId: string) {
    const user = await userRepository.findById(userId);
    const remaining = user?.freeBottomChecksRemaining ?? CREDIT_RULES.freeChecks.bottom;
    if (remaining <= 0) return false;
    await User.updateOne({ _id: toObjectId(userId) }, { $inc: { freeBottomChecksRemaining: -1 }, $set: { updatedAt: new Date() } });
    return true;
  },
  async grant(userId: string, amount: number) {
    if (!amount || amount <= 0) return;
    await User.updateOne({ _id: toObjectId(userId) }, { $inc: { credits: amount }, $set: { updatedAt: new Date() } });
  },
};
