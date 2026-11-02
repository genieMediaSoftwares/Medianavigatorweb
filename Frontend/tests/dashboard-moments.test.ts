import { describe, expect, it } from 'vitest';

import { dailyIdeaIndex, dayKey, savedIdeaIndex, selectLittleWin, TINY_IDEAS } from '@/features/dashboard/moments';
import type { MediaItem } from '@/types/api';

const now = new Date('2026-10-23T12:00:00Z');
const post = (id: string, likes: number, extra: Partial<MediaItem> = {}) => ({ id, likes, publishedAt: '2026-10-22T12:00:00Z', unavailableMetrics: [], ...extra }) as MediaItem;

describe('honest little wins', () => {
  it('ignores unavailable, hidden, invalid and future like counts', () => {
    const real = post('real', 24);
    expect(selectLittleWin([
      post('hidden', 1000, { missingMetrics: ['likes'] }),
      post('unavailable', 900, { unavailableMetrics: ['likes'] }),
      post('invalid', Number.NaN),
      post('future', 800, { publishedAt: '2027-01-01T00:00:00Z' }),
      real,
    ], now)).toEqual(real);
  });

  it('celebrates the newest published post when no positive likes are reported', () => {
    const newest = post('newest', 0);
    expect(selectLittleWin([post('old', 0, { publishedAt: '2026-01-01' }), newest], now)).toEqual(newest);
    expect(selectLittleWin([], now)).toBeNull();
    expect(selectLittleWin([post('bad', 1, { publishedAt: 'invalid' })], now)).toBeNull();
  });

  it('resolves ties consistently without changing the feed', () => {
    const posts = [post('b', 24), post('a', 24)];
    expect(selectLittleWin(posts, now)?.id).toBe('a');
    expect(posts[0].id).toBe('b');
  });
});

describe('a daily handwritten idea', () => {
  it('uses the profile timezone at midnight', () => {
    const instant = new Date('2026-10-23T20:00:00Z');
    expect(dayKey(instant, 'Asia/Kolkata')).toBe('2026-10-24');
    expect(dayKey(instant, 'America/New_York')).toBe('2026-10-23');
    expect(dayKey(instant, 'bad/timezone')).toMatch(/^2026-10-2[34]$/);
  });

  it('restores a shuffled prompt only for the same user and day', () => {
    const saved = JSON.stringify({ day: '2026-10-23', userId: 'a', index: 5 });
    expect(savedIdeaIndex(saved, '2026-10-23', 'a')).toBe(5);
    expect(savedIdeaIndex(saved, '2026-10-24', 'a')).toBe(dailyIdeaIndex('2026-10-24', 'a'));
    expect(savedIdeaIndex(saved, '2026-10-23', 'b')).toBe(dailyIdeaIndex('2026-10-23', 'b'));
  });

  it('recovers safely from corrupted and out-of-range stored preferences', () => {
    const expected = dailyIdeaIndex('2026-10-23', 'a');
    for (const value of [null, 'broken', '{}', JSON.stringify({ day: '2026-10-23', userId: 'a', index: TINY_IDEAS.length })]) {
      expect(savedIdeaIndex(value, '2026-10-23', 'a')).toBe(expected);
    }
  });
});
