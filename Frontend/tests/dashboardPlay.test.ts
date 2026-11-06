import { describe, expect, it } from 'vitest';
import { CHALLENGES, localDay, nextChallenge, readDailyVibe } from '../src/features/home/play';

describe('daily vibe', () => {
  it('uses the local calendar date rather than UTC for the daily reset', () => {
    expect(localDay(new Date(2026, 10, 6, 0, 1))).toBe('2026-11-6');
  });
  it('restores only a known vibe saved today', () => {
    expect(readDailyVibe('{"date":"2026-11-6","id":"chill"}', '2026-11-6')).toEqual({ date: '2026-11-6', id: 'chill' });
    expect(readDailyVibe('{"date":"2026-11-5","id":"chill"}', '2026-11-6')).toBeNull();
    expect(readDailyVibe('{"date":"2026-11-6","id":"unknown"}', '2026-11-6')).toBeNull();
    expect(readDailyVibe('broken')).toBeNull();
    expect(readDailyVibe(null)).toBeNull();
  });
});
it('never immediately repeats a challenge when trying another', () => {
  for (let previous = 0; previous < CHALLENGES.length; previous++) {
    for (const random of [0, 0.25, 0.5, 0.9999]) {
      const next = nextChallenge(previous, () => random);
      expect(next).not.toBe(previous);
      expect(CHALLENGES[next]).toBeDefined();
    }
  }
});
