import { describe, expect, it } from 'vitest';

import { headingFrom, IDEA_LIMIT, ideaFrom, prefillFromRecommendation, TITLE_HEADING_MAX, TITLE_LIMIT } from '@/features/planner/ideaPrefill';

// Real Deep Analysis recommendations (single long lines, as the analysis writes them).
const LOCATION_QUIZ =
  "Script 2 (Comment-Driven Location Quiz): Visual: Opening tight shot of the outdoor bonfire movie screening (00:21), panning out to pool and beach line. On-Screen Text: 'Guess the location of this ₹5,999 beach resort! 👇'. Voiceover: 'Can you guess where this coastal getaway is located in Andhra Pradesh? Comment your guess below for the direct booking link!' CTA: 'Comment your guess below!'.";
const RELOCATOR =
  "Script 2 (Lifestyle Relocator Hook): Visual Concept: Slide 1 split image comparing crowded city traffic (left) vs. quiet sunset at SVN Bay Parck beach (right). On-Screen Text: 'Trading city traffic for coastal tranquility.' Caption: 'Is it time to claim your slice of paradise? Call 9557 399 699 to schedule a weekend site visit.' Call to Action: 'DM us \"PARCK\" for instant site details.'";

describe('Plan this idea prefill', () => {
  it('uses the script’s name as the Title and keeps the whole script as the Idea', () => {
    const p = prefillFromRecommendation({ recommendation: LOCATION_QUIZ });
    expect(p.title).toBe('Comment-Driven Location Quiz');
    expect(p.description).toBe(LOCATION_QUIZ);
    expect(p.descriptionTruncated).toBe(false);
    expect(prefillFromRecommendation({ recommendation: RELOCATOR }).title).toBe('Lifestyle Relocator Hook');
  });

  it('takes the first non-empty line of a multi-line script, without markers or labels', () => {
    const script = '\n\n  **Hook:** Show the sunset first  \nScene 1: drone shot over the bay\nScene 2: guests at the bonfire\nCTA: Book now';
    const p = prefillFromRecommendation({ recommendation: script });
    expect(p.title).toBe('Show the sunset first');
    expect(p.description).toBe(script.trim());
    expect(headingFrom('- 1. "Open with the price"\nthen the villa')).toBe('Open with the price');
  });

  it('caps a long single line at a word boundary, preferring a leading label or first sentence', () => {
    const words = 'Open with a slow pan across the pool at golden hour while the voiceover asks whether this could be your weekend and then cut to guests laughing';
    const t = headingFrom(words);
    expect(t.length).toBeLessThanOrEqual(TITLE_HEADING_MAX);
    expect(t.endsWith('…')).toBe(true);
    expect(words.startsWith(t.slice(0, -1))).toBe(true);
    expect(t.slice(0, -1).endsWith(' ')).toBe(false);
    expect(headingFrom(`Weekend getaway reel: ${words}`)).toBe('Weekend getaway reel');
    expect(headingFrom(`Show the price in the first second. ${words}`)).toBe('Show the price in the first second.');
    // No spaces at all still fits.
    expect(headingFrom('x'.repeat(500)).length).toBe(TITLE_HEADING_MAX);
  });

  it('handles empty and whitespace-only text', () => {
    for (const recommendation of [undefined, null, '', '   \n\n  ', '***\n- \n']) {
      expect(prefillFromRecommendation({ recommendation })).toEqual({ title: '', description: expect.any(String), descriptionTruncated: false });
    }
    expect(prefillFromRecommendation({ recommendation: '' }).description).toBe('');
  });

  it('keeps an explicit title (flattened to one line, at most the field limit) and still fills the Idea', () => {
    const p = prefillFromRecommendation({ title: '  My launch\nreel  ', recommendation: LOCATION_QUIZ });
    expect(p.title).toBe('My launch reel');
    expect(p.description).toBe(LOCATION_QUIZ);
    expect(prefillFromRecommendation({ title: 'y'.repeat(400) }).title).toHaveLength(TITLE_LIMIT);
    expect(prefillFromRecommendation({ title: 'Just a title' })).toEqual({ title: 'Just a title', description: '', descriptionTruncated: false });
  });

  it('shortens an Idea over 2,000 characters and says so', () => {
    const long = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ');
    const idea = ideaFrom(long);
    expect(idea.truncated).toBe(true);
    expect(idea.text.length).toBeLessThanOrEqual(IDEA_LIMIT);
    expect(idea.text).toContain('Shortened to fit the 2,000-character Idea field');
    expect(long.startsWith(idea.text.split('…')[0])).toBe(true);
    const exact = 'a'.repeat(IDEA_LIMIT);
    expect(ideaFrom(exact)).toEqual({ text: exact, truncated: false });
  });
});
