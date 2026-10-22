import { User } from '../models/User.js';
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
    if (!Number.isSafeInteger(amount) || amount <= 0) throw badRequest('Credit amount must be a positive whole number.');
    const updated = await User.updateOne({ _id: toObjectId(userId), $expr: { $gte: [{ $ifNull: ['$credits', CREDIT_RULES.startingBalance] }, amount] } },
      [{ $set: { credits: { $subtract: [{ $ifNull: ['$credits', CREDIT_RULES.startingBalance] }, amount] }, updatedAt: '$$NOW' } }]);
    if (!updated.matchedCount) throw badRequest(`Not enough Insight Credits. This action needs ${amount}.`);
  },
  async useFreeTopCheck(userId: string) { return consumeFreeCheck(userId, 'freeTopChecksRemaining', CREDIT_RULES.freeChecks.top); },
  async useFreeBottomCheck(userId: string) { return consumeFreeCheck(userId, 'freeBottomChecksRemaining', CREDIT_RULES.freeChecks.bottom); },
  async grant(userId: string, amount: number) {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw badRequest('Credit amount must be a positive whole number.');
    await User.updateOne({ _id: toObjectId(userId) }, [{ $set: { credits: { $add: [{ $ifNull: ['$credits', CREDIT_RULES.startingBalance] }, amount] }, updatedAt: '$$NOW' } }]);
  },
};

async function consumeFreeCheck(userId: string, field: 'freeTopChecksRemaining' | 'freeBottomChecksRemaining', initial: number): Promise<boolean> {
  const value = { $ifNull: [`$${field}`, initial] };
  const updated = await User.updateOne({ _id: toObjectId(userId), $expr: { $gte: [value, 1] } }, [{ $set: { [field]: { $subtract: [value, 1] }, updatedAt: '$$NOW' } }]);
  return updated.matchedCount === 1;
}
