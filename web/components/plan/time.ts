/** Planner times are typed like "6:00 PM". Accept 24-hour "18:00" too and tidy both into "6:00 PM". */
const RE_12 = /^(1[0-2]|0?[1-9]):([0-5]\d)\s?(am|pm)$/i;
const RE_24 = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function normaliseTime(input: string): string | null {
  const s = input.trim();
  const a = RE_12.exec(s);
  if (a) return `${Number(a[1])}:${a[2]} ${(a[3] ?? '').toUpperCase()}`;
  const b = RE_24.exec(s);
  if (b) {
    const h = Number(b[1]);
    return `${h % 12 === 0 ? 12 : h % 12}:${b[2]} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  return null;
}

export function minutesOf(time: string): number {
  const n = normaliseTime(time);
  if (!n) return 0;
  const m = RE_12.exec(n);
  if (!m) return 0;
  return (Number(m[1]) % 12) * 60 + Number(m[2]) + ((m[3] ?? '').toUpperCase() === 'PM' ? 720 : 0);
}
