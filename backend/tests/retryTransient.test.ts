import { afterEach, expect, it, vi } from 'vitest';
import { retryTransient } from '../src/services/ai/retryTransient.js';
afterEach(() => vi.useRealTimers());
it('retries temporary failures once and preserves the original timeout budget', async () => {
  vi.useFakeTimers();
  const call = vi.fn().mockRejectedValueOnce({ status: 503 }).mockResolvedValue('ok');
  const result = retryTransient(call, 10000);
  await vi.advanceTimersByTimeAsync(750);
  expect(await result).toBe('ok');
  expect(call.mock.calls.map(c => c[0])).toEqual([10000, 9250]);
});
it('does not retry permission failures or exhausted budgets', async () => {
  for (const [status, budget] of [[403, 10000], [429, 1000]]) {
    const call = vi.fn().mockRejectedValue({ status });
    await expect(retryTransient(call, budget)).rejects.toEqual({ status });
    expect(call).toHaveBeenCalledTimes(1);
  }
});
it('rejects a provider call that never settles once the budget is spent, without a retry past the deadline', async () => {
  vi.useFakeTimers();
  const call = vi.fn((_remainingMs: number) => new Promise<never>(() => {}));
  const result = retryTransient(call, 10000);
  const settled = expect(result).rejects.toMatchObject({ name: 'TimeoutError', status: 504 });
  await vi.advanceTimersByTimeAsync(10000);
  await settled;
  expect(call.mock.calls.map(c => c[0])).toEqual([10000]);
});
it('bounds the retry of a transient failure to the remaining budget', async () => {
  vi.useFakeTimers();
  const call = vi.fn().mockRejectedValueOnce({ status: 503 }).mockImplementation(() => new Promise<never>(() => {}));
  const result = retryTransient(call, 10000);
  const settled = expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
  await vi.advanceTimersByTimeAsync(10000); // 750 ms back-off + the 9250 ms that remained
  await settled;
  expect(call.mock.calls.map(c => c[0])).toEqual([10000, 9250]);
});
