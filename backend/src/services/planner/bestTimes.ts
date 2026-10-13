/**
 * Best-time-to-post engine. Pure: no I/O, no clock unless `now` is passed, no globals.
 *
 * Method (all of it is reported back to the client so nothing is a black box):
 *  1. Keep posts that have a MEASURED value for the chosen metric and are old enough for that metric to have settled
 *     (`maturityHours`). Unmeasured values are skipped, never treated as zero.
 *  2. Compare each post with what was EXPECTED for it: the median of the same account's posts of the same format
 *     published within ±`peerWindowDays` (widening step by step when there are too few). This removes the two biggest
 *     confounders of reach: account growth/decline over time and format (Reels reach far more people than carousels).
 *     Without it, whichever slot you happened to use while growing, or for Reels, would look "best".
 *  2b. Rank each post's actual ÷ expected ratio inside its own account (0 = weakest, 1 = best). Ranks are scale-free,
 *     so big and small accounts (and the aggregate view) compare fairly, and one viral post moves a slot by one rank.
 *  3. Bucket posts by weekday × time window in the account's timezone (DST-aware via Intl). Night runs 9 PM – 6 AM and
 *     belongs to the evening it started on, so a 1 AM Tuesday post counts as Monday night.
 *  4. Slot score = mean percentile shrunk toward "typical" (0.5) by `shrinkagePrior` pseudo-posts, so a slot with one
 *     lucky post cannot outrank a slot with a consistent record.
 *  5. Each slot is tested against all other posts with a Mann–Whitney U test (normal approximation, tie-corrected).
 *     Evidence labels combine sample size, that p-value and how consistently the slot beats typical.
 *  6. A recommendation is only made when a slot clears the minimum evidence bar AND scores above typical.
 *  7. An hour-of-day profile (lightly smoothed across neighbouring hours) and the best 2-hour block inside the winning
 *     slot narrow the window when the posts support it.
 *
 * Posting time is one factor among many (content, format, topic, distribution). Results describe what happened to
 * past posts; they are correlations, not proof that the time caused the outcome.
 */

export type PlannerPlatform = 'instagram' | 'facebook' | 'youtube' | 'linkedin';
export type PlannerMetric = 'engagementRate' | 'reach' | 'views';
export type Evidence = 'strong' | 'moderate' | 'limited' | 'insufficient';
export type WindowKey = 'morning' | 'afternoon' | 'evening' | 'night';
export type NoRecommendationReason = 'not_enough_posts' | 'no_repeated_slot' | 'no_slot_above_typical';

/** Tunable evidence thresholds. Changing them changes labels, never the underlying numbers. */
export const PLANNER_THRESHOLDS = {
  /** Below this many eligible posts no recommendation is attempted. */
  minTotalPosts: 10,
  /** A slot needs at least this many posts before it can be recommended. */
  minSlotPosts: 3,
  moderate: { minSlotPosts: 5, minTotalPosts: 20, maxPValue: 0.2 },
  strong: { minSlotPosts: 8, minTotalPosts: 40, maxPValue: 0.05, minShareAboveTypical: 0.6 },
  /** Pseudo-posts at "typical" (percentile 0.5) blended into every slot score. */
  shrinkagePrior: 3,
  /** A narrower 2-hour block inside the recommended slot needs this many of the slot's posts in it. */
  narrowRange: { minBlockPosts: 5, hours: 2 },
  /** Expected value of a post = median of peers (same account, same format) published within ± this many days. */
  peerWindowDays: 21,
  /** Fewest peers for an expectation; with fewer, the peer group widens (any format, then all time). */
  minPeers: 5,
  /** Hours a post needs before its numbers are treated as settled. YouTube views keep growing for days. */
  maturityHours: { instagram: 48, facebook: 48, linkedin: 72, youtube: 168 } as Record<PlannerPlatform, number>,
} as const;

/** Grouping defaults, not claims about universal best times. Hours are local, end exclusive. */
export const TIME_WINDOWS: ReadonlyArray<{ key: WindowKey; label: string; startHour: number; endHour: number }> = [
  { key: 'morning', label: 'Morning', startHour: 6, endHour: 12 },
  { key: 'afternoon', label: 'Afternoon', startHour: 12, endHour: 17 },
  { key: 'evening', label: 'Evening', startHour: 17, endHour: 21 },
  { key: 'night', label: 'Night', startHour: 21, endHour: 6 },
];

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type WeekdayName = (typeof WEEKDAYS)[number];

export interface PlannerPost {
  accountId: string;
  platform: PlannerPlatform;
  publishedAt: Date;
  contentType: string;
  /** Only metrics the platform actually measured for this post. */
  values: Partial<Record<PlannerMetric, number>>;
}

export interface SlotResult {
  day: WeekdayName;
  window: WindowKey;
  posts: number;
  /** 0–100; 50 = the account's typical post. null when the slot has no posts. */
  score: number | null;
  /** Raw metric statistics (single-account views only; mixing accounts' raw numbers would mislead). */
  mean: number | null;
  median: number | null;
  /** Slot median vs account median, in percent. null when not meaningful. */
  liftPct: number | null;
  /** Share of this slot's posts that beat the account's typical post. */
  shareAboveTypical: number | null;
  pValue: number | null;
  evidence: Evidence;
  /** Relative intensity among populated slots, for the heatmap. */
  level: 0 | 1 | 2 | 3 | 4 | null;
}

export interface BestTimeResult {
  timezone: string;
  metric: PlannerMetric;
  aggregate: boolean;
  eligiblePosts: number;
  excluded: { unmeasured: number; tooRecent: number };
  baseline: { mean: number | null; median: number | null };
  slots: SlotResult[];
  /** Hour of day (local, 0–23), all days combined. `score` is smoothed across neighbouring hours. */
  hours: Array<{ hour: number; posts: number; score: number | null }>;
  /** The best 2-hour block across all days, when enough posts support it. */
  bestHours: null | { range: string; startTime: string; startHour: number; posts: number; score: number };
  /** Raw metric by format (single account only), so formats can be compared on the same metric. */
  formats: Array<{ type: string; posts: number; median: number | null; liftPct: number | null }>;
  pattern: {
    mostUsed: null | { day: WeekdayName; window: WindowKey; posts: number; score: number };
    slotsUsed: number;
    untestedSlots: number;
  };
  /** How each post's expected value was estimated. */
  adjustment: { period: boolean; format: boolean; peerWindowDays: number };
  recommendation: null | {
    day: WeekdayName;
    window: WindowKey;
    windowLabel: string;
    timeRange: string;
    /** A narrower range inside the window, only when the posts support it. Never a single "perfect minute". */
    narrowRange: string | null;
    narrowStartTime: string | null;
    posts: number;
    score: number;
    mean: number | null;
    median: number | null;
    liftPct: number | null;
    shareAboveTypical: number;
    pValue: number;
    evidence: Exclude<Evidence, 'insufficient'>;
    preliminary: boolean;
  };
  evidence: Evidence;
  noRecommendationReason: NoRecommendationReason | null;
}

// ---------------------------------------------------------------------------------------------------------------
// Time helpers

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(timezone: string): Intl.DateTimeFormat {
  let f = fmtCache.get(timezone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long', hour: 'numeric', hourCycle: 'h23' });
    fmtCache.set(timezone, f);
  }
  return f;
}

/** Weekday (0 = Monday) and window of a timestamp in `timezone`. Night hours after midnight belong to the previous day. */
export function slotOf(date: Date, timezone: string): { dayIndex: number; window: WindowKey; hour: number } | null {
  if (Number.isNaN(date.getTime())) return null;
  const parts = formatter(timezone).formatToParts(date);
  const dayIndex = WEEKDAYS.indexOf(parts.find((p) => p.type === 'weekday')?.value as WeekdayName);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  if (dayIndex < 0 || !Number.isFinite(hour)) return null;
  const window = TIME_WINDOWS.find((w) => (w.startHour < w.endHour ? hour >= w.startHour && hour < w.endHour : hour >= w.startHour || hour < w.endHour))!.key;
  const shifted = window === 'night' && hour < 6 ? (dayIndex + 6) % 7 : dayIndex;
  return { dayIndex: shifted, window, hour };
}

export function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`;
}

export function windowRange(key: WindowKey): string {
  const w = TIME_WINDOWS.find((x) => x.key === key)!;
  return `${hourLabel(w.startHour)} – ${hourLabel(w.endHour)}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Statistics helpers

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const mean = (values: number[]): number | null => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

/** Percentile rank (midrank for ties) of every value, in input order, on a 0–1 scale. */
export function percentileRanks(values: number[]): number[] {
  const n = values.length;
  if (n === 1) return [0.5];
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n);
  for (let i = 0; i < n; ) {
    let j = i;
    while (j + 1 < n && order[j + 1].v === order[i].v) j++;
    const mid = (i + j) / 2; // 0-based midrank
    for (let k = i; k <= j; k++) ranks[order[k].i] = mid / (n - 1);
    i = j + 1;
  }
  return ranks;
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** Two-sided Mann–Whitney U p-value for `a` vs `b` (normal approximation, tie and continuity corrected). */
export function mannWhitneyP(a: number[], b: number[]): number | null {
  const n1 = a.length, n2 = b.length, n = n1 + n2;
  if (n1 === 0 || n2 === 0) return null;
  const all = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort((x, y) => x.v - y.v);
  let r1 = 0, tieTerm = 0;
  for (let i = 0; i < n; ) {
    let j = i;
    while (j + 1 < n && all[j + 1].v === all[i].v) j++;
    const rank = (i + j) / 2 + 1;
    const t = j - i + 1;
    tieTerm += t ** 3 - t;
    for (let k = i; k <= j; k++) if (all[k].g === 0) r1 += rank;
    i = j + 1;
  }
  const u = r1 - (n1 * (n1 + 1)) / 2;
  const mu = (n1 * n2) / 2;
  const variance = ((n1 * n2) / 12) * (n + 1 - tieTerm / (n * (n - 1)));
  if (variance <= 0) return 1;
  const z = (Math.abs(u - mu) - 0.5) / Math.sqrt(variance);
  return Math.min(1, 2 * (1 - normalCdf(Math.max(0, z))));
}

// ---------------------------------------------------------------------------------------------------------------

function evidenceFor(posts: number, total: number, pValue: number | null, shareAbove: number | null): Evidence {
  const T = PLANNER_THRESHOLDS;
  if (posts === 0) return 'insufficient';
  if (posts < T.minSlotPosts || total < T.minTotalPosts || pValue === null) return 'limited';
  if (posts >= T.strong.minSlotPosts && total >= T.strong.minTotalPosts && pValue <= T.strong.maxPValue && (shareAbove ?? 0) >= T.strong.minShareAboveTypical) return 'strong';
  if (posts >= T.moderate.minSlotPosts && total >= T.moderate.minTotalPosts && pValue <= T.moderate.maxPValue) return 'moderate';
  return 'limited';
}

const round = (v: number | null, dp = 2) => (v === null ? null : Number(v.toFixed(dp)));

const hoursOf = (key: WindowKey): number[] => {
  const w = TIME_WINDOWS.find((x) => x.key === key)!;
  const length = (w.endHour - w.startHour + 24) % 24 || 24;
  return Array.from({ length }, (_, i) => (w.startHour + i) % 24);
};

/** Best 2-hour block inside a slot, from that slot's own posts. Never narrower than 2 hours, never a single minute. */
function bestBlock(window: WindowKey, entries: Array<{ hour: number; pct: number }>, minScore: number): { label: string; start: string } | null {
  const T = PLANNER_THRESHOLDS;
  const hours = hoursOf(window);
  let best: { start: number; score: number } | null = null;
  for (let i = 0; i + T.narrowRange.hours <= hours.length; i++) {
    const block = new Set(hours.slice(i, i + T.narrowRange.hours));
    const inBlock = entries.filter((e) => block.has(e.hour));
    if (inBlock.length < T.narrowRange.minBlockPosts) continue;
    const score = (inBlock.reduce((a, e) => a + e.pct, 0) + T.shrinkagePrior * 0.5) / (inBlock.length + T.shrinkagePrior);
    // Start the block at the first hour that actually has posts, so it describes when they really went out.
    const first = hours.slice(i, i + T.narrowRange.hours).find((h) => inBlock.some((e) => e.hour === h))!;
    if (!best || score > best.score) best = { start: first, score };
  }
  if (!best || Math.round(best.score * 100) < minScore) return null;
  return { label: `${hourLabel(best.start)} – ${hourLabel(best.start + T.narrowRange.hours)}`, start: hourLabel(best.start) };
}

/**
 * Expected value for every post: median of its peers (same account; same format; published within ±peerWindowDays).
 * Peer groups widen when too small, keeping the format for as long as possible because format moves reach more than a
 * few weeks of growth: same format ±window, same format ±2×window, same format any time, any format ±window, everything.
 */
export function expectedValues(group: Array<{ value: number; publishedAt: Date; contentType: string }>): number[] {
  const T = PLANNER_THRESHOLDS;
  const span = T.peerWindowDays * 86_400_000;
  return group.map((p, i) => {
    const others = group.filter((_, j) => j !== i);
    const within = (o: (typeof group)[number], ms: number) => Math.abs(o.publishedAt.getTime() - p.publishedAt.getTime()) <= ms;
    const sameType = others.filter((o) => o.contentType === p.contentType);
    const tiers = [sameType.filter((o) => within(o, span)), sameType.filter((o) => within(o, span * 2)), sameType, others.filter((o) => within(o, span)), others];
    const peers = tiers.find((t) => t.length >= T.minPeers) ?? others;
    return median(peers.map((o) => o.value)) ?? p.value;
  });
}

export function computeBestTimes(
  posts: PlannerPost[],
  opts: { metric: PlannerMetric; timezone: string; now: Date },
): BestTimeResult {
  const T = PLANNER_THRESHOLDS;
  const accounts = new Set(posts.map((p) => p.accountId));
  const aggregate = accounts.size > 1;
  let unmeasured = 0, tooRecent = 0;

  const eligible: Array<PlannerPost & { value: number }> = [];
  for (const p of posts) {
    const value = p.values[opts.metric];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) { unmeasured++; continue; }
    if (opts.now.getTime() - p.publishedAt.getTime() < T.maturityHours[p.platform] * 3_600_000) { tooRecent++; continue; }
    eligible.push({ ...p, value });
  }

  // Percentile within each account.
  const pct = new Map<(typeof eligible)[number], number>();
  const accountMedian = new Map<string, number | null>();
  for (const id of accounts) {
    const group = eligible.filter((e) => e.accountId === id);
    const med = median(group.map((g) => g.value));
    accountMedian.set(id, med);
    // actual ÷ expected, with a small floor so zero-valued peers don't divide by zero.
    const eps = Math.max((med ?? 0) * 0.01, 1e-6);
    const expected = expectedValues(group);
    percentileRanks(group.map((g, i) => (g.value + eps) / (expected[i] + eps))).forEach((r, i) => pct.set(group[i], r));
  }
  const singleMedian = aggregate ? null : accountMedian.get([...accounts][0] ?? '') ?? null;

  const cells = new Map<string, Array<{ index: number; value: number; pct: number; hour: number }>>();
  eligible.forEach((e, index) => {
    const s = slotOf(e.publishedAt, opts.timezone);
    if (!s) return;
    const key = `${s.dayIndex}|${s.window}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push({ index, value: e.value, pct: pct.get(e)!, hour: s.hour });
  });

  const allPct = eligible.map((e) => pct.get(e)!);
  const total = eligible.length;
  const slots: SlotResult[] = [];
  for (let d = 0; d < 7; d++) {
    for (const w of TIME_WINDOWS) {
      const entries = cells.get(`${d}|${w.key}`) ?? [];
      const n = entries.length;
      if (n === 0) {
        slots.push({ day: WEEKDAYS[d], window: w.key, posts: 0, score: null, mean: null, median: null, liftPct: null, shareAboveTypical: null, pValue: null, evidence: 'insufficient', level: null });
        continue;
      }
      const inPct = entries.map((e) => e.pct);
      const inSlot = new Set(entries.map((e) => e.index));
      const rest = allPct.filter((_, i) => !inSlot.has(i));
      const shrunk = (inPct.reduce((a, b) => a + b, 0) + T.shrinkagePrior * 0.5) / (n + T.shrinkagePrior);
      const shareAbove = inPct.filter((v) => v > 0.5).length / n;
      const pValue = rest.length > 0 ? mannWhitneyP(inPct, rest) : null;
      const med = median(entries.map((e) => e.value));
      slots.push({
        day: WEEKDAYS[d], window: w.key, posts: n,
        score: Math.round(shrunk * 100),
        mean: aggregate ? null : round(mean(entries.map((e) => e.value))),
        median: aggregate ? null : round(med),
        liftPct: !aggregate && singleMedian && med !== null ? round(((med - singleMedian) / singleMedian) * 100, 1) : null,
        shareAboveTypical: round(shareAbove),
        pValue: round(pValue, 4),
        evidence: evidenceFor(n, total, pValue, shareAbove),
        level: null,
      });
    }
  }

  // Heatmap intensity: five equal steps between the weakest and strongest populated slot score.
  const scored = slots.filter((s) => s.score !== null);
  const lo = Math.min(...scored.map((s) => s.score!)), hi = Math.max(...scored.map((s) => s.score!));
  for (const s of scored) s.level = hi === lo ? 2 : (Math.min(4, Math.floor(((s.score! - lo) / (hi - lo)) * 5)) as 0 | 1 | 2 | 3 | 4);

  const baseline = { mean: aggregate ? null : round(mean(eligible.map((e) => e.value))), median: aggregate ? null : round(singleMedian) };

  // Hour-of-day profile across all days, smoothed 1-2-1 over neighbouring hours and shrunk toward typical.
  const byHour = Array.from({ length: 24 }, () => [] as number[]);
  for (const entries of cells.values()) for (const e of entries) byHour[e.hour].push(e.pct);
  const hours = byHour.map((list, h) => {
    if (list.length === 0) return { hour: h, posts: 0, score: null };
    let sum = 0, n = 0;
    for (const [dh, w] of [[-1, 1], [0, 2], [1, 1]] as const) {
      const l = byHour[(h + dh + 24) % 24];
      sum += w * l.reduce((a, b) => a + b, 0);
      n += w * l.length;
    }
    return { hour: h, posts: list.length, score: Math.round(((sum + T.shrinkagePrior * 0.5 * 2) / (n + T.shrinkagePrior * 2)) * 100) };
  });
  let bestHours: BestTimeResult['bestHours'] = null;
  for (let h = 0; h < 24; h++) {
    const block = [...byHour[h], ...byHour[(h + 1) % 24]];
    if (block.length < T.narrowRange.minBlockPosts) continue;
    const score = Math.round(((block.reduce((a, b) => a + b, 0) + T.shrinkagePrior * 0.5) / (block.length + T.shrinkagePrior)) * 100);
    if (score > 50 && (!bestHours || score > bestHours.score)) bestHours = { range: `${hourLabel(h)} – ${hourLabel(h + 2)}`, startTime: hourLabel(h), startHour: h, posts: block.length, score };
  }

  // Formats on the raw metric (single account): which format reaches more people on this account.
  const formats = aggregate ? [] : [...new Set(eligible.map((e) => e.contentType))]
    .map((type) => {
      const vals = eligible.filter((e) => e.contentType === type).map((e) => e.value);
      const fm = median(vals);
      return { type, posts: vals.length, median: round(fm), liftPct: singleMedian && fm !== null ? round(((fm - singleMedian) / singleMedian) * 100, 1) : null };
    })
    .filter((f) => f.posts >= T.minSlotPosts)
    .sort((a, b) => (b.median ?? 0) - (a.median ?? 0));

  const used = slots.filter((x) => x.posts > 0);
  const top = [...used].sort((a, b) => b.posts - a.posts || b.score! - a.score!)[0];
  const pattern = {
    mostUsed: top ? { day: top.day, window: top.window, posts: top.posts, score: top.score! } : null,
    slotsUsed: used.length,
    untestedSlots: slots.length - used.length,
  };

  const base = {
    timezone: opts.timezone, metric: opts.metric, aggregate, eligiblePosts: total, excluded: { unmeasured, tooRecent }, baseline, slots,
    hours, bestHours, formats, pattern, adjustment: { period: true, format: true, peerWindowDays: T.peerWindowDays },
  };

  if (total < T.minTotalPosts) return { ...base, recommendation: null, evidence: 'insufficient', noRecommendationReason: 'not_enough_posts' };
  const candidates = slots.filter((s) => s.posts >= T.minSlotPosts);
  if (candidates.length === 0) return { ...base, recommendation: null, evidence: 'insufficient', noRecommendationReason: 'no_repeated_slot' };
  const best = [...candidates].sort((a, b) => b.score! - a.score! || b.posts - a.posts)[0];
  if (best.score! <= 50) return { ...base, recommendation: null, evidence: 'insufficient', noRecommendationReason: 'no_slot_above_typical' };

  // With enough posts to detect a difference and none detected, "no clear winner" is the accurate answer;
  // a preliminary pick is only offered while there is too little data to test properly.
  if (best.evidence === 'limited' && total >= T.moderate.minTotalPosts && best.posts >= T.moderate.minSlotPosts) {
    return { ...base, recommendation: null, evidence: 'insufficient', noRecommendationReason: 'no_slot_above_typical' };
  }
  const evidence = best.evidence as Exclude<Evidence, 'insufficient'>;
  const entries = cells.get(`${WEEKDAYS.indexOf(best.day)}|${best.window}`)!;
  const narrow = evidence === 'limited' ? null : bestBlock(best.window, entries, best.score!);
  return {
    ...base,
    evidence,
    noRecommendationReason: null,
    recommendation: {
      day: best.day, window: best.window,
      windowLabel: TIME_WINDOWS.find((w) => w.key === best.window)!.label,
      timeRange: windowRange(best.window),
      narrowRange: narrow?.label ?? null,
      narrowStartTime: narrow?.start ?? null,
      posts: best.posts, score: best.score!, mean: best.mean, median: best.median, liftPct: best.liftPct,
      shareAboveTypical: best.shareAboveTypical!, pValue: best.pValue ?? 1,
      evidence, preliminary: evidence === 'limited',
    },
  };
}
