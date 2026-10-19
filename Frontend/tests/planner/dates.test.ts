import { describe, expect, it } from 'vitest';

import {
  addDays, addMonths, formatDay, formatTime, isValidLocalDate, monthGrid, nextDateOn, parseTime, rangeFor, relativeDay, startOfWeek, todayIn, utcToZoned, weekDates, zonedToUtc,
} from '@/features/planner/dates';

describe('planner dates', () => {
  it('knows today in the planner timezone, not the device’s', () => {
    // 2026-10-19 20:00 UTC is already the 20th in Kolkata and still the 19th in Los Angeles.
    const now = new Date('2026-10-19T20:00:00Z');
    expect(todayIn('Asia/Kolkata', now)).toBe('2026-10-20');
    expect(todayIn('America/Los_Angeles', now)).toBe('2026-10-19');
  });

  it('crosses week, month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01');
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19'); // Sunday → its Monday
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28');
    expect(weekDates('2026-12-30')).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  });

  it('builds whole-week month grids', () => {
    const grid = monthGrid('2026-02-10');
    expect(grid.length % 7).toBe(0);
    expect(grid[0].date).toBe('2026-01-26');
    expect(grid.filter((d) => d.inMonth)).toHaveLength(28);
  });

  it('converts across daylight saving like the server', () => {
    expect(zonedToUtc('2026-10-31', '09:00', 'America/New_York').date.toISOString()).toBe('2026-10-31T13:00:00.000Z');
    expect(zonedToUtc('2026-11-02', '09:00', 'America/New_York').date.toISOString()).toBe('2026-11-02T14:00:00.000Z');
    const gap = zonedToUtc('2026-03-08', '02:30', 'America/New_York');
    expect(gap.shifted).toBe(true);
    expect(utcToZoned(gap.date, 'America/New_York').time).toBe('03:30');
  });

  it('asks the API for whole local days', () => {
    expect(rangeFor('2026-10-19', '2026-10-25', 'Asia/Kolkata')).toEqual({ from: '2026-10-18T18:30:00.000Z', to: '2026-10-25T18:30:00.000Z' });
  });

  it('rejects impossible dates and parses both time styles', () => {
    expect(isValidLocalDate('2026-02-30')).toBe(false);
    expect(isValidLocalDate('2026-13-01')).toBe(false);
    expect(parseTime('6:00 PM')).toBe('18:00');
    expect(parseTime('12:15 am')).toBe('00:15');
    expect(parseTime('09:30')).toBe('09:30');
    expect(parseTime('25:00')).toBeNull();
    expect(formatTime('00:05')).toBe('12:05 AM');
  });

  it('labels days relative to today and dates legacy weekdays from today forward', () => {
    expect(relativeDay('2026-10-19', '2026-10-19')).toBe('Today');
    expect(relativeDay('2026-10-20', '2026-10-19')).toBe('Tomorrow');
    expect(relativeDay('2026-10-18', '2026-10-19')).toBe('Yesterday');
    expect(formatDay('2027-01-04', '2026-10-19')).toBe('Mon, 4 Jan 2027');
    // Today is a Monday: "Monday" means today, "Sunday" the coming Sunday (audit #14).
    expect(nextDateOn('Monday', '2026-10-19')).toBe('2026-10-19');
    expect(nextDateOn('Sunday', '2026-10-19')).toBe('2026-10-25');
  });
});
