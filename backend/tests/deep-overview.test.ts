import { describe, expect, it } from 'vitest';
import { groundOverview, requiredOverviewSections, type OverviewDraft } from '../src/services/ai/deepV2.overview.js';
import { overviewMetrics } from '../src/services/ai/deepV2.metrics.js';
import { postTextSources } from '../src/services/ai/deepV2.text.js';
import type { DeepSource } from '../../shared/deepAnalysisV2.js';
import type { ContentItemDoc } from '../src/models/ContentItem.js';
const caption = postTextSources('One-Day Wedding Package – ₹6,00,000 for 100 guests. DM us to enquire.', '')[0];
const image: DeepSource = { ...caption, id: 'source_image', source: 'image', assetId: 'image_1', quote: null, description: 'A blue graphic with a wedding offer and DM invitation.' };
const draft = (): OverviewDraft => ({ headline: 'A direct package announcement', introduction: 'The post introduces a one-day wedding offer. The copy makes its price and guest count explicit.', verdict: 'The offer is specific, with a clear invitation to enquire.', evidenceIds: [caption.id], sections: [{ key: 'message', title: 'A specific package offer', assessment: 'The caption names the wedding package and guest count.', status: 'good', evidenceIds: [caption.id] }, { key: 'caption', title: 'Concrete opening information', assessment: 'The offer, price and guest count appear together.', status: 'strong', evidenceIds: [caption.id] }, { key: 'cta', title: 'A direct message invitation', assessment: 'The caption asks readers to DM for enquiries.', status: 'good', evidenceIds: [caption.id] }], facts: [{ label: 'Price', value: '₹6,00,000', quote: '₹6,00,000 for 100 guests', evidenceId: caption.id }], actions: [{ kind: 'change', title: 'Separate the package details', why: 'The offer and invitation share one block of text.', what: 'Place the offer, guest count and DM invitation on separate lines.', example: null, evidenceIds: [caption.id] }] });
describe('complete post overview grounding', () => {
  it('covers the dimensions supported by the actual sources', () => {
    expect(requiredOverviewSections([caption], 'post')).toEqual(['message', 'caption', 'cta']);
    expect(requiredOverviewSections([caption, image], 'post')).toEqual(['message', 'visual', 'caption', 'alignment', 'cta']);
  });
  it('rejects incomplete coverage instead of generating an empty successful report', () => {
    expect(() => groundOverview(draft(), [caption, image], ['message', 'visual', 'caption', 'alignment', 'cta'])).toThrow('visual');
  });
  it('keeps valid exact facts and omits invented or reformatted values', () => {
    const data = draft(); data.facts.push({ label: 'Wrong price', value: '₹60,000', quote: '₹6,00,000 for 100 guests', evidenceId: caption.id }, { label: 'Invented inclusion', value: 'Catering included', quote: 'Catering included', evidenceId: caption.id });
    expect(groundOverview(data, [caption], ['message', 'caption', 'cta']).facts).toEqual([data.facts[0]]);
  });
  it('does not discard the overview because a recommendation cites a missing source', () => {
    const data = draft(); data.actions[0].evidenceIds = ['another_post'];
    const result = groundOverview(data, [caption], ['message', 'caption', 'cta']);
    expect(result.sections).toHaveLength(3); expect(result.actions).toEqual([]);
  });
  it('requires both visual and caption evidence for an alignment claim', () => {
    const data = draft(); data.sections.push({ key: 'alignment', title: 'Aligned wording', assessment: 'The message matches.', status: 'good', evidenceIds: [caption.id] });
    expect(() => groundOverview(data, [caption, image], ['alignment'])).toThrow('alignment');
    data.sections.at(-1)!.evidenceIds.push(image.id);
    expect(groundOverview(data, [caption, image], ['alignment']).sections.at(-1)?.key).toBe('alignment');
  });
  it('rejects unsupported guaranteed outcomes in the lead assessment', () => {
    const data = draft(); data.introduction = 'This will increase conversions.';
    expect(() => groundOverview(data, [caption], ['message'])).toThrow('introduction');
  });
  it('requires temporal/slide evidence for story progression and audio evidence for audio review', () => {
    const video = { ...image, id: 'video_1', source: 'video_frame' as const, startSeconds: 0, endSeconds: 5 };
    const audio = { ...video, id: 'audio_1', source: 'audio' as const };
    expect(requiredOverviewSections([caption, video, audio], 'reel')).toContain('structure');
    expect(requiredOverviewSections([caption, video, audio], 'reel')).toContain('audio');
  });
});
describe('exact original post data', () => {
  it('preserves the complete long caption without invented AI quotations', () => {
    const text = 'అందరికీ ధన్యవాదాలు. '.repeat(200);
    const sources = postTextSources(text, 'Original title');
    expect(sources.filter((s) => s.source === 'caption').map((s) => s.quote).join('')).toBe(text);
    expect(sources.every((s) => s.quote!.length <= 1200)).toBe(true);
    expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length);
  });
  it('keeps measured zeros and omits missing metrics or borrowed reach aliases', () => {
    const doc = { platform: 'facebook', syncedAt: new Date(), likes: 0, comments: 2, shares: 0, views: 0, reach: 9, engagementRate: 0, saves: null, unavailableMetrics: ['views', 'engagementRate', 'shares'], normalized: {} } as unknown as ContentItemDoc;
    const metrics = overviewMetrics(doc);
    expect(metrics.items.find((m) => m.key === 'likes')?.value).toBe(0);
    expect(metrics.items.map((m) => m.key)).toEqual(['likes', 'comments']);
  });
});
