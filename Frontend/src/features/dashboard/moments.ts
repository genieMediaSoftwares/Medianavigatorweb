import { postMetricValue } from '@/features/analysis/post-metrics';
import type { MediaItem } from '@/types/api';

// Handwritten, intentionally small prompts. No generation or analytics required.
export const TINY_IDEAS = [
  { title: 'Show the part people don’t usually see.', body: 'Share one behind-the-scenes moment from your work today.' },
  { title: 'Tell the story of your first try.', body: 'What did you learn when you were just getting started?' },
  { title: 'Answer one question you hear often.', body: 'Keep it simple. One helpful answer can make a lovely post.' },
  { title: 'Let one small detail have its moment.', body: 'Share a close-up of something you put care into.' },
  { title: 'Share a lesson, while it’s still fresh.', body: 'What is one thing this week taught you?' },
  { title: 'Introduce the person behind the work.', body: 'Tell your audience one little thing about yourself.' },
  { title: 'Show where an idea began.', body: 'A sketch, a note or a first draft can tell a story.' },
  { title: 'Celebrate a small step forward.', body: 'Share something you finished, fixed or finally tried.' },
  { title: 'Make one useful thing easier.', body: 'Share a quick tip you wish you had known sooner.' },
  { title: 'Give a little thank-you.', body: 'Celebrate someone who helped you along the way. Ask before sharing their story.' },
  { title: 'Share what you’re curious about.', body: 'Ask your audience a question you would love to hear their take on.' },
  { title: 'Show your favourite tool at work.', body: 'Tell people what you use it for and why you like it.' },
  { title: 'Give an old idea a fresh sentence.', body: 'Explain something you do using words you haven’t used before.' },
  { title: 'Share a tiny before and after.', body: 'Show one small change and tell the story behind it.' },
] as const;

export function dayKey(now = new Date(), timezone?: string | null): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    return ['year', 'month', 'day'].map((part) => parts.find((p) => p.type === part)!.value).join('-');
  } catch {
    return dayKey(now);
  }
}

export function dailyIdeaIndex(day: string, userId: string): number {
  let hash = 0;
  for (const letter of `${userId}:${day}`) hash = (Math.imul(hash, 31) + letter.charCodeAt(0)) >>> 0;
  return hash % TINY_IDEAS.length;
}

export function savedIdeaIndex(value: string | null, day: string, userId: string): number {
  try {
    const saved = JSON.parse(value ?? 'null');
    if (saved?.day === day && saved?.userId === userId && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < TINY_IDEAS.length) return saved.index;
  } catch { /* An old or unreadable preference uses today's deterministic prompt. */ }
  return dailyIdeaIndex(day, userId);
}

/** A highlight from the recent synced feed, never a claim to rank an entire account or month. */
export function selectLittleWin(posts: MediaItem[], now = new Date()): MediaItem | null {
  const valid = posts.filter((post) => Number.isFinite(Date.parse(post.publishedAt)) && Date.parse(post.publishedAt) <= now.getTime());
  const liked = valid.filter((post) => (postMetricValue(post, 'likes') ?? 0) > 0);
  return [...(liked.length ? liked : valid)].sort((a, b) => (
    (liked.length ? postMetricValue(b, 'likes')! - postMetricValue(a, 'likes')! : 0)
    || Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
    || a.id.localeCompare(b.id)
  ))[0] ?? null;
}
