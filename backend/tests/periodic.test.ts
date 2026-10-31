import { afterEach, describe, expect, it, vi } from 'vitest';

const beats = vi.hoisted(() => [] as string[]);
vi.mock('../src/jobs/heartbeat.js', () => ({ recordHeartbeat: async (task: string) => { beats.push(task); } }));
import { startPeriodic } from '../src/jobs/periodic.js';

afterEach(() => { vi.useRealTimers(); beats.length = 0; });

describe('periodic background task', () => {
  it('runs immediately, never overlaps, heartbeats only on success and keeps running after a failure', async () => {
    vi.useFakeTimers();
    let active = 0, maxActive = 0, calls = 0;
    const release: Array<() => void> = [];
    const stop = startPeriodic('t', 1000, async () => {
      calls++; active++; maxActive = Math.max(maxActive, active);
      try {
        if (calls === 2) throw new Error('transient');
        await new Promise<void>((r) => release.push(r));
      } finally { active--; }
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(1); // immediate first run

    await vi.advanceTimersByTimeAsync(3500); // ticks while the first run is still in progress are skipped
    expect(calls).toBe(1);
    release.shift()!();
    await vi.advanceTimersByTimeAsync(0);
    expect(beats).toEqual(['t']);

    await vi.advanceTimersByTimeAsync(1000); // second run fails: no heartbeat
    expect(calls).toBe(2);
    expect(beats).toEqual(['t']);

    await vi.advanceTimersByTimeAsync(1000); // retried at the normal interval
    expect(calls).toBe(3);
    release.shift()!();
    await vi.advanceTimersByTimeAsync(0);
    expect(beats).toEqual(['t', 't']);
    expect(maxActive).toBe(1);

    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toBe(3);
  });
});
