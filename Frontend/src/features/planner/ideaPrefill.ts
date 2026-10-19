/**
 * Turns an analysis recommendation (often a multi-line script) into the new-plan form's starting values:
 * a short Title heading and the full text as the Idea. Pure, so it is unit-tested.
 */

/** Longest heading taken from a recommendation; users can still type up to TITLE_LIMIT. */
export const TITLE_HEADING_MAX = 100;
/** The Title field's limit (the server allows 300). */
export const TITLE_LIMIT = 300;
/** The Idea field's limit (the server allows 2,000). */
export const IDEA_LIMIT = 2000;

const IDEA_TRUNCATED_NOTE = '\n\n[Shortened to fit the 2,000-character Idea field. The full recommendation is under “Why this idea?”.]';

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Cuts at a word boundary so the result (with "…") is at most `max` characters. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const room = text.slice(0, max - 1);
  const space = room.lastIndexOf(' ');
  // Only back up to a space that keeps most of the text; otherwise cut mid-word.
  return `${(space >= max * 0.6 ? room.slice(0, space) : room).replace(/[\s,;:–—-]+$/, '')}…`;
}

const GENERIC_LABEL = '(?:script|hook|idea|title|concept|option|scene)\\s*\\d*';

/**
 * A short heading from the first non-empty line, without list markers, Markdown emphasis or wrapping quotes.
 * Deep Analysis writes scripts as "Script 2 (Name): Visual: …", so a named script uses its name. A generic
 * "Hook:" label is dropped. A line still over the limit uses its leading label or first sentence when that fits,
 * else it is clipped at a word.
 */
export function headingFrom(text: string | null | undefined, max = TITLE_HEADING_MAX): string {
  const line = (text ?? '').split(/\r?\n/).map((l) => l.trim()).find((l) => l.replace(/[\s*_#>•\-–—"“”'‘’`]/g, '').length > 0);
  if (!line) return '';
  const h = oneLine(line)
    .replace(/^(?:#{1,6}\s+|>\s*|[-*•–—]\s+|\d{1,2}[.)]\s+)+/, '')
    .replace(/[*_`]{1,3}/g, '')
    .replace(/^["“'‘]+|["”'’]+$/g, '')
    .trim();
  const named = new RegExp(`^${GENERIC_LABEL}\\s*\\(([^)]{3,80})\\)\\s*[:–—-]`, 'i').exec(h);
  if (named) return clip(named[1].trim(), max);
  const body = h.replace(new RegExp(`^${GENERIC_LABEL}\\s*[:–—-]\\s*`, 'i'), '').trim();
  if (!body) return '';
  if (body.length <= max) return body;
  const label = /^([^:.!?]{12,80}):\s/.exec(body)?.[1];
  if (label) return label.trim();
  const sentence = /^(.+?[.!?])(?:\s|$)/.exec(body)?.[1];
  if (sentence && sentence.length >= 12 && sentence.length <= max) return sentence;
  return clip(body, max);
}

/** The Idea text: the recommendation as written, shortened only when over the field limit, and then said so. */
export function ideaFrom(text: string | null | undefined, max = IDEA_LIMIT): { text: string; truncated: boolean } {
  const t = (text ?? '').replace(/\r\n/g, '\n').trim();
  if (t.length <= max) return { text: t, truncated: false };
  return { text: clip(t, max - IDEA_TRUNCATED_NOTE.length) + IDEA_TRUNCATED_NOTE, truncated: true };
}

/**
 * Starting Title and Idea for a new plan. An explicit title (from the link that opened the form) wins and is only
 * flattened to one line and capped at the field limit; otherwise the heading comes from the recommendation.
 */
export function prefillFromRecommendation(input: { title?: string | null; recommendation?: string | null }): { title: string; description: string; descriptionTruncated: boolean } {
  const explicit = oneLine(input.title ?? '');
  const idea = ideaFrom(input.recommendation);
  return {
    title: explicit ? explicit.slice(0, TITLE_LIMIT) : headingFrom(input.recommendation),
    description: idea.text,
    descriptionTruncated: idea.truncated,
  };
}
