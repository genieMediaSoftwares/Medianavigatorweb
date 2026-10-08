import { formatDistanceToNowStrict } from 'date-fns';

/** All number, percentage and date formatting lives here so every screen reads the same. */

export const compact = (n: number): string => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const whole = (n: number): string => new Intl.NumberFormat('en').format(Math.round(n));
export const percent = (n: number, digits = 1): string => `${new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(n)}%`;

/** "+12%" / "-4%" for a change; empty string when unknown. */
export function change(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  const r = Math.round(n);
  return `${r > 0 ? '+' : ''}${r}%`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  if (Date.now() - d.getTime() < 60_000) return 'Just now';
  return `${formatDistanceToNowStrict(d)} ago`;
}

export function dateShort(iso: string, timeZone?: string | null): string {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', ...(timeZone ? { timeZone } : {}) }).format(new Date(iso));
}

export function dateTime(iso: string, timeZone?: string | null): string {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', ...(timeZone ? { timeZone } : {}) }).format(new Date(iso));
}

export const initials = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
