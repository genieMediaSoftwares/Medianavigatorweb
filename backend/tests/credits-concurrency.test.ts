import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { startTestDb, stopTestDb, clearDb, registerUser } from './helpers.js';
import { User } from '../src/models/User.js';
import { creditService } from '../src/services/credits.service.js';
beforeAll(startTestDb); afterAll(stopTestDb); beforeEach(clearDb);
describe('atomic credit accounting', () => {
  it('cannot overspend or consume more free checks under concurrent requests', async () => {
    const u = await registerUser('credits@example.com');
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => creditService.spend(u.id, 10)));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(5);
    expect((await User.findById(u.id))?.credits).toBe(0);
    const checks = await Promise.all(Array.from({ length: 20 }, () => creditService.useFreeTopCheck(u.id)));
    expect(checks.filter(Boolean)).toHaveLength(5);
    expect((await User.findById(u.id))?.freeTopChecksRemaining).toBe(0);
  });
  it('handles legacy missing balances atomically and refuses invalid amounts', async () => {
    const u = await registerUser('legacy@example.com');
    await User.updateOne({ _id: u.id }, { $unset: { credits: 1, freeBottomChecksRemaining: 1 } });
    await creditService.spend(u.id, 20);
    expect((await User.findById(u.id))?.credits).toBe(30);
    expect(await creditService.useFreeBottomCheck(u.id)).toBe(true);
    expect((await User.findById(u.id))?.freeBottomChecksRemaining).toBe(4);
    for (const amount of [NaN, Infinity, -1, 0, 1.2]) await expect(creditService.spend(u.id, amount)).rejects.toThrow();
  });
});
