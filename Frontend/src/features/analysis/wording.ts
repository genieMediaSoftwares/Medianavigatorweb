// Ported unchanged from web/lib/platforms.ts, web/lib/performance.ts and web/components/posts/plain-language.ts.
import type { MediaItem, PostClass } from '@/types/api';

const TYPE_LABEL: Record<string, string> = { reel: 'Reel', short: 'Short', video: 'Video', post: 'Post', carousel: 'Carousel', article: 'Article' };
export const typeLabel = (t: string, basis?: 'provider' | 'inferred'): string => `${TYPE_LABEL[t] ?? t}${basis === 'inferred' ? ' (estimated)' : ''}`;

/** Video formats (reels, shorts and videos). */
export const isVideoType = (t: string): boolean => ['reel', 'short', 'video'].includes(t);

export type Metric = 'views' | 'likes' | 'comments' | 'reach' | 'shares';

/** True when the platform did not give this number for this post, so it must read N/A, never 0. */
export function isUnavailable(item: Pick<MediaItem, 'unavailableMetrics' | 'missingMetrics'>, metric: Metric): boolean {
  return item.unavailableMetrics.includes(metric) || (item.missingMetrics ?? []).includes(metric);
}

/** "+632% vs avg views (5,741)" → "632% more views than your usual (5,741)". */
export function plainComparison(text: string): string {
  const t = text.trim();
  const a = /^([+-])?(\d+(?:\.\d+)?)%\s+(?:below\s+)?vs\s+avg\s+(\w+)\s*(\(([^)]*)\))?/i.exec(t);
  const b = /^([+-])?(\d+(?:\.\d+)?)%\s+(\w+)\s+vs\s+your\s+(?:median|avg|average)\s*(\(([^)]*)\))?/i.exec(t);
  const c = /^([+-])?(\d+(?:\.\d+)?)%\s+(?:below|above)\s+avg\s+(\w+)\s*(\(([^)]*)\))?/i.exec(t);
  const m = c ?? a ?? b;
  if (m) {
    const below = m[1] === '-' || /below/i.test(t);
    const n = Number(m[2]);
    const metric = (m[3] ?? 'views').toLowerCase();
    const detail = m[5] ? ` of ${m[5].replace(/,?\s*n=\d+/i, '').trim()}` : '';
    if (n < 1) return `About the same ${metric} as your usual${detail}`;
    return `${m[2]}% ${below ? 'fewer' : 'more'} ${metric === 'engagement' ? 'engagement' : metric} than your usual${detail}`.replace('fewer engagement', 'less engagement').replace('fewer reach', 'lower reach');
  }
  return t.replace(/\byour median\b/gi, 'your usual').replace(/\bmedian\b/gi, 'typical').replace(/\bavg\b|\baverage\b/gi, 'usual').replace(/\bbaseline\b/gi, 'usual').replace(/,?\s*n=\d+/g, '');
}

export function plainClass(c: PostClass): string {
  switch (c) {
    case 'TOP':
      return 'This post is doing better than most of your posts.';
    case 'LOW':
      return 'This post is doing less well than most of your posts.';
    case 'TYPICAL':
      return 'This post is close to what you usually get.';
    default:
      return 'We need a few more posts before we can say how this one compares.';
  }
}

export const sentence = (s: string) => {
  const t = s.trim();
  return /[.!?)]$/.test(t) ? t : `${t}.`;
};
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
