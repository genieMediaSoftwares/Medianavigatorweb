import { afterEach, describe, expect, it, vi } from 'vitest';
import { bytes, change, compact, percent, timeAgo, whole } from '@/lib/format';

describe('format', () => {
  afterEach(() => vi.useRealTimers());

  it('shortens big numbers and rounds whole ones', () => {
    expect(compact(12840)).toBe('12.8K');
    expect(compact(950)).toBe('950');
    expect(whole(1234.6)).toBe('1,235');
  });
  it('formats percentages and changes, and says nothing when a change is unknown', () => {
    expect(percent(4.567)).toBe('4.6%');
    expect(change(12.4)).toBe('+12%');
    expect(change(-3.6)).toBe('-4%');
    expect(change(null)).toBe('');
    expect(change(undefined)).toBe('');
  });
  it('says how long ago something was', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
    expect(timeAgo('2026-10-08T11:59:40Z')).toBe('Just now');
    expect(timeAgo('2026-10-08T10:00:00Z')).toBe('2 hours ago');
    expect(timeAgo(null)).toBe('Never');
  });
  it('formats file sizes', () => {
    expect(bytes(512)).toBe('512 B');
    expect(bytes(2048)).toBe('2.0 KB');
    expect(bytes(5 * 1048576)).toBe('5.0 MB');
  });
});
