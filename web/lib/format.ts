/**
 * The one formatting module. Locale comes from the browser; the time zone is the user's saved time zone when there is
 * one (pass `tz`), so dates read the same way the API bucketed them.
 */
import { formatDistanceStrict } from 'date-fns';

export const formatNumber = (n: number) => new Intl.NumberFormat(undefined).format(n);

export const formatCompact = (n: number) =>
  new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: n >= 1000 ? 1 : 0 }).format(n);

/** `value` is already a percentage (12.5 means 12.5%). */
export const formatPercent = (value: number, digits = 1) =>
  new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value / 100);

/** A change in percent with an explicit sign: "+12%", "−8%", "No change". */
export function formatChange(value: number, digits = 0): string {
  if (Math.abs(value) < 0.5 && digits === 0) return 'No change';
  const s = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: digits, signDisplay: 'always' }).format(value / 100);
  return s.replace('-', '−');
}

export function formatDate(iso: string, tz?: string | null): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: tz ?? undefined }).format(d);
}

export function formatDateTime(iso: string, tz?: string | null): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz ?? undefined }).format(d);
}

/** "3 hours ago". Returns null for missing or invalid timestamps so callers can say "Not updated yet" instead. */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (Math.abs(now.getTime() - d.getTime()) < 45_000) return 'just now';
  return formatDistanceStrict(d, now, { addSuffix: true });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${formatNumber(bytes)} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(v)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Percentage change from `previous` to `current`, or null when there is nothing to compare against. */
export const pctChange = (current: number, previous: number): number | null =>
  previous > 0 ? ((current - previous) / previous) * 100 : null;
