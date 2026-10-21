/**
 * Calendar dates and wall-clock times in an IANA timezone, with Intl only (the project has no date library).
 * Dates are "YYYY-MM-DD" strings and times "HH:mm" (24-hour); instants are ISO strings from the API.
 * Mirrors backend/src/lib/zonedTime.ts, which is the authority when a plan is saved.
 */

export type LocalDate = string;
export type LocalTime = string;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    formatters.set(timeZone, f);
  }
  return f;
}

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    formatter(tz);
    return true;
  } catch {
    return false;
  }
}

/** The device's timezone, or UTC when the runtime can't tell. */
export function deviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimezone(tz) ? tz : 'UTC';
  } catch {
    return 'UTC';
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
const toLocal = (y: number, m: number, d: number): LocalDate => `${y}-${pad(m)}-${pad(d)}`;
const split = (date: LocalDate) => date.split('-').map(Number) as [number, number, number];

function parts(ms: number, timeZone: string) {
  const p: Record<string, number> = {};
  for (const x of formatter(timeZone).formatToParts(new Date(ms))) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return { y: p.year, mo: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second };
}

function offsetAt(ms: number, timeZone: string) {
  const p = parts(ms, timeZone);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}

export function isValidLocalDate(s: unknown): s is LocalDate {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = split(s);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const isValidLocalTime = (s: unknown): s is LocalTime => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/**
 * The instant the clock in `timeZone` shows `date time`. A repeated hour (DST fall-back) gives the first occurrence;
 * a skipped hour (spring-forward) moves forward and sets `shifted`.
 */
export function zonedToUtc(date: LocalDate, time: LocalTime, timeZone: string): { date: Date; shifted: boolean } {
  const [y, mo, d] = split(date);
  const [h, mi] = time.split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const candidates = [...new Set([offsetAt(wall - 86_400_000, timeZone), offsetAt(wall, timeZone), offsetAt(wall + 86_400_000, timeZone)])]
    .map((off) => wall - off)
    .filter((t) => {
      const p = parts(t, timeZone);
      return p.y === y && p.mo === mo && p.d === d && p.h === h && p.mi === mi;
    })
    .sort((a, b) => a - b);
  if (candidates.length) return { date: new Date(candidates[0]), shifted: false };
  return { date: new Date(wall - offsetAt(wall - 86_400_000, timeZone)), shifted: true };
}

export function utcToZoned(instant: Date | string, timeZone: string): { date: LocalDate; time: LocalTime } {
  const p = parts(new Date(instant).getTime(), timeZone);
  return { date: toLocal(p.y, p.mo, p.d), time: `${pad(p.h)}:${pad(p.mi)}` };
}

export const todayIn = (timeZone: string, now = new Date()): LocalDate => utcToZoned(now, timeZone).date;

export function addDays(date: LocalDate, n: number): LocalDate {
  const [y, m, d] = split(date);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return toLocal(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addMonths(date: LocalDate, n: number): LocalDate {
  const [y, m] = split(date);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return toLocal(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayIndex(date: LocalDate): number {
  const [y, m, d] = split(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
export const weekdayName = (date: LocalDate) => WEEKDAYS[weekdayIndex(date)];

/** Monday of the week containing `date` (weeks start on Monday, as in the best-times grid). */
export const startOfWeek = (date: LocalDate): LocalDate => addDays(date, -((weekdayIndex(date) + 6) % 7));

export const weekDates = (date: LocalDate): LocalDate[] => {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

/** Month grid: whole weeks (Monday first) covering the month of `date`; `inMonth` marks the month's own days. */
export function monthGrid(date: LocalDate): { date: LocalDate; inMonth: boolean }[] {
  const [y, m] = split(date);
  const first = toLocal(y, m, 1);
  const last = addDays(addMonths(first, 1), -1);
  const out: { date: LocalDate; inMonth: boolean }[] = [];
  for (let d = startOfWeek(first); d <= last || out.length % 7 !== 0; d = addDays(d, 1)) out.push({ date: d, inMonth: d.slice(0, 7) === first.slice(0, 7) });
  return out;
}

export const compareDates = (a: LocalDate, b: LocalDate) => (a < b ? -1 : a > b ? 1 : 0);

/** Start of day `date` in `timeZone`, as an instant. Used to request a date range from the API. */
export const startOfDayUtc = (date: LocalDate, timeZone: string): Date => zonedToUtc(date, '00:00', timeZone).date;

/** API range [from, to) covering whole local days `first`…`last`. */
export function rangeFor(first: LocalDate, last: LocalDate, timeZone: string): { from: string; to: string } {
  return { from: startOfDayUtc(first, timeZone).toISOString(), to: startOfDayUtc(addDays(last, 1), timeZone).toISOString() };
}

/** "18:05" → "6:05 PM". */
export function formatTime(time: LocalTime): string {
  const [h, mi] = time.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(mi)} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** "Tue, 20 Oct" (adds the year when it isn't `relativeTo`'s year). */
export function formatDay(date: LocalDate, relativeTo?: LocalDate): string {
  const [y, m, d] = split(date);
  const year = relativeTo && relativeTo.slice(0, 4) !== String(y) ? ` ${y}` : '';
  return `${WEEKDAYS[weekdayIndex(date)].slice(0, 3)}, ${d} ${MONTHS[m - 1]}${year}`;
}

export const formatMonth = (date: LocalDate) => `${MONTHS_LONG[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

/** "Today", "Tomorrow", "Yesterday" or "Tue, 20 Oct". */
export function relativeDay(date: LocalDate, today: LocalDate): string {
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  if (date === addDays(today, -1)) return 'Yesterday';
  return formatDay(date, today);
}

/** The next date (today included) that falls on a weekday name, e.g. to date a legacy "Monday" plan. */
export function nextDateOn(weekday: string, today: LocalDate): LocalDate {
  const target = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]);
  if (target < 0) return today;
  return addDays(today, (target - weekdayIndex(today) + 7) % 7);
}

/** "6:00 PM" or "18:00" → "18:00" (legacy plans and best-time ranges use the 12-hour form). */
export function parseTime(input: string): LocalTime | null {
  const s = input.trim();
  const a = /^(1[0-2]|0?[1-9]):([0-5]\d)\s?(am|pm)$/i.exec(s);
  if (a) {
    const h = Number(a[1]) % 12 + (a[3].toLowerCase() === 'pm' ? 12 : 0);
    return `${pad(h)}:${a[2]}`;
  }
  const b = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s);
  return b ? `${pad(Number(b[1]))}:${b[2]}` : null;
}
