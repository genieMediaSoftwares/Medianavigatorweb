import type { PostClass } from '@/types/api';

/** Turns the API's comparison wording into everyday words ("+632% vs avg views (5,741)" => "632% more views than your usual (5,741)"). */
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
    return `${m[2]}% ${below ? 'fewer' : 'more'} ${metric === 'engagement' ? 'engagement' : metric} than your usual${detail}`.replace('fewer engagement', 'less engagement');
  }
  return t.replace(/\byour median\b/gi, 'your usual').replace(/\bmedian\b/gi, 'typical').replace(/\bavg\b|\baverage\b/gi, 'usual').replace(/\bbaseline\b/gi, 'usual').replace(/,?\s*n=\d+/g, '');
}

/** Plain sentence for the way a post compares with the person's other posts. */
export function plainClass(c: PostClass): string {
  switch (c) {
    case 'TOP': return 'This post is doing better than most of your posts.';
    case 'LOW': return 'This post is doing less well than most of your posts.';
    case 'TYPICAL': return 'This post is close to what you usually get.';
    default: return 'We need a few more posts before we can say how this one compares.';
  }
}

const METRIC_WORDS: Record<string, string> = { watchTimeMinutes: 'watch time', saves: 'saves', views: 'views', reach: 'reach', likes: 'likes', comments: 'comments', shares: 'shares', impressions: 'impressions' };
export const metricWords = (m: string): string => METRIC_WORDS[m] ?? m.replace(/([A-Z])/g, ' $1').toLowerCase();

/** "70% fewer views" / "about the same" for a difference expressed as a % of the other post. */
export function plainDifference(label: string, pct: number): string {
  const r = Math.round(Math.abs(pct));
  if (r < 2) return `About the same ${label}`;
  return `${r}% ${pct > 0 ? 'more' : 'fewer'} ${label}`;
}
