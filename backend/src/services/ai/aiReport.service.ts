import { z } from 'zod';
import type { PlatformType } from '../../../../shared/types.js';
import { loadAnalyticsContext, dataVersionOf } from '../analytics.service.js';
import { buildSummary } from '../analytics.stats.js';
import { aiAvailable } from './geminiClient.js';
import { reportPrompt, SYSTEM, type ReportKind } from './prompts.js';
import { runAiStep, aiMeta } from './aiStep.js';

const s = (n = 500) => z.string().max(n);
const list = (max: number, n = 500) => z.array(s(n)).max(max);

export const REPORT_SCHEMAS = {
  executive: z.object({ headline: s(300), whatHappened: list(4), whyItMayHaveHappened: list(4), whatToDoNext: list(4), watchOut: list(3) }),
  trends: z.object({
    summary: s(800),
    trends: z.array(z.object({ title: s(200), evidence: s(500), meaning: s(500) })).max(5),
    ideas: z.array(z.object({ title: s(200), format: s(60), why: s(500), hook: s(300) })).max(6),
  }),
  strategy: z.object({
    summary: s(800), cadence: s(500),
    formatMix: z.array(z.object({ format: s(60), advice: s(500) })).max(5),
    timing: s(500),
    experiments: z.array(z.object({ test: s(400), measureBy: s(300) })).max(4),
  }),
  patterns: z.object({
    summary: s(800),
    patterns: z.array(z.object({ title: s(200), evidence: s(500), confidence: z.enum(['Low', 'Medium', 'High']) })).max(6),
    formatNotes: z.array(z.object({ format: s(60), note: s(500) })).max(6),
  }),
  audit: z.object({
    summary: s(800), strengths: list(5), weaknesses: list(5),
    priorityActions: z.array(z.object({ action: s(400), reason: s(500) })).max(5),
  }),
} as const;

const short = (t: string) => t.replace(/\s+/g, ' ').slice(0, 80);

export const aiReportService = {
  /** Gemini-written report from measured/calculated facts. Without Gemini the caller gets the facts and an honest status, never invented text. */
  async generate(userId: string, kind: ReportKind, opts: { platform?: PlatformType; days: number }) {
    const ctx = await loadAnalyticsContext(userId);
    const since = Date.now() - opts.days * 86_400_000;
    const scoped = ctx.media.filter((m) => (!opts.platform || m.platform === opts.platform) && new Date(m.publishedAt).getTime() >= since);
    if (scoped.length === 0) {
      return { kind, report: null, measured: null, ai: aiMeta('not_needed', { reason: 'No synced posts in this period' }), scope: { platform: opts.platform ?? 'all', days: opts.days } };
    }
    const connectedPlatforms = ctx.connections.filter((c) => c.connected).map((c) => c.platform);
    const summary = buildSummary({ media: ctx.media, connectedPlatforms, platform: opts.platform, days: opts.days });
    const row = (m: (typeof scoped)[number]) => ({ title: short(m.title), platform: m.platform, format: m.contentType, publishedAt: m.publishedAt, views: m.views, likes: m.likes, comments: m.comments, engagementPct: m.engagementRate });
    const ranked = [...scoped].sort((a, b) => b.engagementRate - a.engagementRate);
    const window = ctx.engine.getTimingData().strongestWindow;
    const facts = {
      measured: { postsInPeriod: scoped.length, periodDays: opts.days, platforms: [...new Set(scoped.map((m) => m.platform))], totalViews: scoped.reduce((n, m) => n + m.views, 0), totalInteractions: scoped.reduce((n, m) => n + m.likes + m.comments + m.shares, 0) },
      calculated: {
        baselines: summary.baselines, insufficientHistory: summary.insufficientHistory,
        formatPerformance: summary.contentTypePerformance, topicPerformance: summary.topicPerformance, periodComparison: summary.periodComparison,
        bestWindow: window ? { label: window.label, slot: window.timeSlot, note: window.supportingText, timezone: ctx.timezone } : null,
        topPosts: ranked.slice(0, 5).map(row), bottomPosts: ranked.slice(-5).reverse().map(row),
      },
    };
    const step = await runAiStep({
      userId: ctx.uid, type: `report:${kind}`, subject: `${opts.platform ?? 'all'}:${opts.days}`,
      dataVersion: dataVersionOf(scoped), system: SYSTEM, prompt: reportPrompt(kind, facts), schema: REPORT_SCHEMAS[kind] as z.ZodType<unknown>,
    });
    return { kind, report: step.data, measured: facts, ai: step.ai, scope: { platform: opts.platform ?? 'all', days: opts.days }, aiAvailable: aiAvailable() };
  },
};
