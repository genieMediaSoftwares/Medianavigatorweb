/**
 * Wall-clock ↔ instant conversion for IANA timezones, using only Intl (no date library in this project).
 * Planner times are entered as a local date and time in a timezone; they are stored as an absolute instant
 * plus the original local values, so a later timezone change never moves a plan.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export type WeekdayName = (typeof WEEKDAYS)[number];

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

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
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    formatter(tz);
    return true;
  } catch {
    return false;
  }
}

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-30). */
export function isValidLocalDate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export const isValidLocalTime = (s: unknown): s is string => typeof s === 'string' && TIME_RE.test(s);

/** The local wall-clock parts of an instant in a timezone. */
function parts(ms: number, timeZone: string) {
  const p: Record<string, number> = {};
  for (const x of formatter(timeZone).formatToParts(new Date(ms))) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return { y: p.year, mo: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second };
}

/** Offset of the timezone from UTC at an instant, in ms (east positive). */
function offsetAt(ms: number, timeZone: string) {
  const p = parts(ms, timeZone);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}

/**
 * The instant at which the clock in `timeZone` shows `localDate localTime`.
 * - A time that happens twice (DST fall-back) resolves to the first occurrence.
 * - A time that never happens (DST spring-forward gap) moves forward by the gap; `shifted` is then true.
 */
export function zonedToUtc(localDate: string, localTime: string, timeZone: string): { date: Date; shifted: boolean } {
  if (!isValidLocalDate(localDate) || !isValidLocalTime(localTime) || !isValidTimezone(timeZone)) throw new RangeError('Invalid local date, time or timezone');
  const [y, mo, d] = localDate.split('-').map(Number);
  const [h, mi] = localTime.split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Try both offsets around the wall time; keep the earliest instant that displays exactly this wall time.
  const candidates = [...new Set([offsetAt(wall - 86_400_000, timeZone), offsetAt(wall, timeZone), offsetAt(wall + 86_400_000, timeZone)])]
    .map((off) => wall - off)
    .filter((t) => {
      const p = parts(t, timeZone);
      return p.y === y && p.mo === mo && p.d === d && p.h === h && p.mi === mi;
    })
    .sort((a, b) => a - b);
  if (candidates.length) return { date: new Date(candidates[0]), shifted: false };
  // In a gap: use the offset from before the transition, which lands just after the gap.
  return { date: new Date(wall - offsetAt(wall - 86_400_000, timeZone)), shifted: true };
}

/** Local date, time and weekday of an instant in a timezone. */
export function utcToZoned(date: Date, timeZone: string): { localDate: string; localTime: string; weekday: WeekdayName } {
  const p = parts(date.getTime(), timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  const localDate = `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
  return { localDate, localTime: `${pad(p.h)}:${pad(p.mi)}`, weekday: WEEKDAYS[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()] };
}

/** Weekday of a YYYY-MM-DD calendar date (independent of timezone). */
export function weekdayOf(localDate: string): WeekdayName {
  const [y, mo, d] = localDate.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
}

/** "18:05" → "6:05 PM", the display form the web planner already stores. */
export function to12h(localTime: string): string {
  const [h, mi] = localTime.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(mi).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
