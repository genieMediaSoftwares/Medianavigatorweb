import { describe, expect, it } from 'vitest';
import { formatBytes, formatChange, pctChange, timeAgo } from '@/lib/format';
import { classify } from '@/lib/performance';
import { formatLabel } from '@/lib/copy';
import { emailField, safeNext } from '@/lib/validation';
import type { Baseline } from '@/types/api';

describe('format', () => {
  it('signs changes and treats tiny ones as no change', () => {
    expect(formatChange(12)).toBe('+12%');
    expect(formatChange(-8)).toBe('−8%');
    expect(formatChange(0.2)).toBe('No change');
  });
  it('returns null (not "0") when there is nothing to compare against', () => {
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(15, 10)).toBe(50);
  });
  it('says nothing for a missing timestamp instead of inventing one', () => {
    expect(timeAgo(null)).toBeNull();
    expect(timeAgo('not a date')).toBeNull();
    expect(timeAgo('2026-01-01T00:00:00Z', new Date('2026-01-01T00:00:10Z'))).toBe('just now');
  });
  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});

describe('formatLabel', () => {
  it('never calls YouTube content a Reel and marks inferred formats as estimated', () => {
    expect(formatLabel('short', 'inferred')).toBe('Short (estimated)');
    expect(formatLabel('video', 'provider')).toBe('Video');
  });
});

describe('classify (mirrors the API rule)', () => {
  const b: Baseline = { sampleSize: 10, medianEngagementRate: 4, p25EngagementRate: 2.5, p75EngagementRate: 5.5, medianViews: 1000, p25Views: 500, p75Views: 2000 };
  it('needs at least 5 posts of history', () => {
    expect(classify(50, { ...b, sampleSize: 4 })).toBe('INSUFFICIENT_DATA');
    expect(classify(50, undefined)).toBe('INSUFFICIENT_DATA');
  });
  it('labels top, low and typical against the user\'s own baseline', () => {
    expect(classify(6, b)).toBe('TOP');
    expect(classify(5.5, { ...b, medianEngagementRate: 5 })).toBe('TYPICAL'); // above P75 but not 1.25x median
    expect(classify(2, b)).toBe('LOW');
    expect(classify(4, b)).toBe('TYPICAL');
  });
});

describe('validation', () => {
  it('gives a friendly hint while typing an email', () => {
    const r = emailField.safeParse('name.example.com');
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe('Add an @ to your email');
  });
  it('only allows same-site relative redirects after sign-in', () => {
    expect(safeNext('/posts?tab=working')).toBe('/posts?tab=working');
    expect(safeNext('https://evil.example')).toBeNull();
    expect(safeNext('//evil.example')).toBeNull();
    expect(safeNext('/\\evil.example')).toBeNull();
  });
});
