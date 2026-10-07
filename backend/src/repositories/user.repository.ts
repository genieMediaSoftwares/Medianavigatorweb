import type { Types } from 'mongoose';
import { User, type UserDoc } from '../models/User.js';
import { toObjectId } from '../lib/ids.js';

export const userRepository = {
  findById: (id: string | Types.ObjectId) => User.findById(typeof id === 'string' ? toObjectId(id) : id).lean<UserDoc>(),

  findByEmail: (email: string) => User.findOne({ email: email.toLowerCase() }).lean<UserDoc>(),

  /** Only place that selects the password hash. */
  findByEmailWithPassword: (email: string) => User.findOne({ email: email.toLowerCase() }).select('+passwordHash').lean<UserDoc>(),
  findByIdWithPassword: (id: string) => User.findById(toObjectId(id)).select('+passwordHash').lean<UserDoc>(),

  create: async (data: { email: string; passwordHash: string; role?: 'user' | 'admin' }) => {
    const doc = await User.create({ ...data, passwordChangedAt: new Date() });
    return doc.toObject() as UserDoc;
  },

  registerLoginSuccess: (id: Types.ObjectId) =>
    User.updateOne({ _id: id }, { $set: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } }),

  registerLoginFailure: async (id: Types.ObjectId, maxAttempts: number, lockMinutes: number) => {
    const user = await User.findOneAndUpdate({ _id: id }, { $inc: { failedLoginCount: 1 } }, { new: true }).lean<UserDoc>();
    if (user && user.failedLoginCount >= maxAttempts) {
      await User.updateOne({ _id: id }, { $set: { lockedUntil: new Date(Date.now() + lockMinutes * 60_000), failedLoginCount: 0 } });
    }
  },

  setPassword: (id: Types.ObjectId, passwordHash: string) =>
    User.updateOne({ _id: id }, { $set: { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null } }),

  setRole: (id: string, role: 'user' | 'admin') => User.findByIdAndUpdate(toObjectId(id), { $set: { role } }, { new: true }).lean<UserDoc>(),
  setStatus: (id: string, status: 'active' | 'disabled') => User.findByIdAndUpdate(toObjectId(id), { $set: { status } }, { new: true }).lean<UserDoc>(),
  markDeleted: (id: Types.ObjectId, anonymizedEmail: string) =>
    User.updateOne({ _id: id }, { $set: { deletedAt: new Date(), status: 'disabled', email: anonymizedEmail } }),

  countAdmins: () => User.countDocuments({ role: 'admin', status: 'active', deletedAt: null }),

  async page(params: { limit: number; cursor?: { t: number; id: string }; search?: string }) {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (params.search) filter.email = { $regex: `^${params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' };
    if (params.cursor) {
      filter.$or = [
        { createdAt: { $lt: new Date(params.cursor.t) } },
        { createdAt: new Date(params.cursor.t), _id: { $lt: toObjectId(params.cursor.id) } },
      ];
    }
    const rows = await User.find(filter).sort({ createdAt: -1, _id: -1 }).limit(params.limit + 1).lean<UserDoc[]>();
    return rows;
  },
  count: () => User.countDocuments({ deletedAt: null }),
};
