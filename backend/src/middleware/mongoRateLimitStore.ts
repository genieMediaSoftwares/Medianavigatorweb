import type { Store, Options, ClientRateLimitInfo } from 'express-rate-limit';
import { RateLimit } from '../models/RateLimit.js';

/** express-rate-limit store backed by MongoDB so limits are enforced across all API instances (no Redis needed). */
export class MongoRateLimitStore implements Store {
  private windowMs = 60_000;
  constructor(readonly prefix: string) {}

  init(options: Options) { this.windowMs = options.windowMs; }
  private id(key: string) { return `${this.prefix}:${key}`; }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = new Date();
    const next = new Date(now.getTime() + this.windowMs);
    // Atomic: start a fresh window when the previous one has expired, otherwise add one to the current window.
    const doc = await RateLimit.findOneAndUpdate(
      { _id: this.id(key) },
      [{
        $set: {
          count: { $cond: [{ $gt: [{ $ifNull: ['$expiresAt', new Date(0)] }, now] }, { $add: [{ $ifNull: ['$count', 0] }, 1] }, 1] },
          expiresAt: { $cond: [{ $gt: [{ $ifNull: ['$expiresAt', new Date(0)] }, now] }, '$expiresAt', next] },
        },
      }],
      { upsert: true, new: true },
    ).lean<{ count: number; expiresAt: Date }>();
    return { totalHits: doc!.count, resetTime: doc!.expiresAt };
  }

  async decrement(key: string) { await RateLimit.updateOne({ _id: this.id(key), count: { $gt: 0 } }, { $inc: { count: -1 } }); }
  async resetKey(key: string) { await RateLimit.deleteOne({ _id: this.id(key) }); }
}
