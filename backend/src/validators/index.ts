import { z } from 'zod';
import { pageQuery } from '../lib/pagination.js';
import { isObjectId } from '../lib/ids.js';
import { isValidLocalDate } from '../lib/zonedTime.js';
import { ALL_PLAN_FORMATS, REMINDER_OFFSETS } from '../services/planner/plans.js';

const email = z.string().trim().toLowerCase().email().max(254);
export const password = z.string().min(8, 'Password must be at least 8 characters').max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must contain at least one letter and one number');
const text = (max: number) => z.string().trim().min(1).max(max);
const objectId = z.string().refine(isObjectId, 'Invalid id');
const platform = z.enum(['instagram', 'facebook', 'youtube', 'linkedin']);
const timezone = z.string().max(64).refine((tz) => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } }, 'Unknown IANA timezone');

export const auth = {
  register: z.object({ email, password, fullName: text(120), organization: text(160).optional(), accountType: text(60).optional() }).strict(),
  login: z.object({ email, password: z.string().min(1).max(128) }).strict(),
  refresh: z.object({ refreshToken: z.string().min(20).max(200) }).strict(),
  changePassword: z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict(),
  forgot: z.object({ email }).strict(),
  reset: z.object({ token: z.string().min(20).max(200), newPassword: password }).strict(),
};

export const users = {
  profile: z.object({
    fullName: text(120).optional(), organization: text(160).optional(), accountType: text(60).optional(), timezone: timezone.optional(), onboardingCompleted: z.boolean().optional(),
    notificationPrefs: z.object({ syncUpdates: z.boolean().optional(), connectionProblems: z.boolean().optional(), performanceAlerts: z.boolean().optional() }).strict()
      .refine((v) => Object.keys(v).length > 0, 'Provide at least one notification category').optional(),
  }).strict()
    .refine((v) => Object.keys(v).length > 0, 'Provide at least one field'),
  deleteAccount: z.object({ password: z.string().min(1).max(128) }).strict(),
  sessionParams: z.object({ id: objectId }).strict(),
};

const credential = z.string().trim().min(1).max(4096);
export const connections = {
  platformParams: z.object({ platform }).strict(),
  runParams: z.object({ id: objectId }).strict(),
  connect: z.object({
    accessToken: credential.optional(), apiKey: credential.optional(), accountId: z.string().trim().max(200).optional(), pageId: z.string().trim().max(200).optional(),
    channelId: z.string().trim().max(200).optional(), channelQuery: z.string().trim().max(200).optional(), organizationId: z.string().trim().max(200).optional(), username: z.string().trim().max(200).optional(),
  }).strict().refine((v) => v.accessToken || v.apiKey, 'accessToken or apiKey is required'),
  oauthCallback: z.object({ code: z.string().min(1).max(2048).optional(), state: z.string().min(10).max(200), error: z.string().max(200).optional(), error_description: z.string().max(500).optional() }).passthrough(),
};

export const media = {
  list: pageQuery.extend({ platform: z.enum(['all', 'instagram', 'facebook', 'youtube', 'linkedin']).optional() }).strict(),
  params: z.object({ id: z.string().min(1).max(200) }).strict(),
};

export const intelligence = {
  summary: z.object({ platform: platform.optional(), days: z.coerce.number().int().min(7).max(365).default(30) }).strict(),
  performers: z.object({ sortBy: z.enum(['views', 'engagement', 'likes', 'comments']).default('views'), platform: platform.optional() }).strict(),
  history: z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), platform: platform.optional(), limit: z.coerce.number().int().min(1).max(366).default(90) }).strict(),
  ask: z.object({ question: z.string().trim().min(2).max(500) }).strict(),
  item: z.object({ mediaId: z.string().min(1).max(200) }).strict(),
  diagnose: z.object({ mediaId: z.string().min(1).max(200), forcedStatus: z.enum(['working', 'underperforming', 'average']).optional() }).strict(),
  compare: z.object({ mediaIdA: z.string().min(1).max(200), mediaIdB: z.string().min(1).max(200) }).strict(),
  creativeReport: z.object({ mediaId: z.string().min(1).max(200), type: z.enum(['why_top', 'why_bottom']), reanalyze: z.boolean().optional() }).strict(),
  deepReport: z.object({ mediaId: z.string().min(1).max(200), reanalyze: z.boolean().optional() }).strict(),
  deepV2: z.object({ postId: z.string().min(1).max(200), goal: z.string().trim().min(1).max(300).optional(), reanalyze: z.boolean().optional() }).strict(),
  deepV2Job: z.object({ jobId: z.string().regex(/^[a-f\d]{24}$/i) }),
  deepV2Action: z.object({ jobId: z.string().regex(/^[a-f\d]{24}$/i), actionId: z.enum(['action_repeat', 'action_change', 'action_idea']) }),
  contentAnalysis: z.object({
    mediaId: z.string().min(1).max(200),
    type: z.enum(['deep', 'why_top', 'why_bottom']),
    reanalyze: z.boolean().optional(),
    /** Position in the list the user came from, e.g. "#2 of 18 by views". Context only. */
    rank: z.string().max(80).optional(),
  }).strict(),
  contentAnalysisQuery: z.object({ mediaId: z.string().min(1).max(200), type: z.enum(['deep', 'why_top', 'why_bottom']) }).strict(),
};

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine(isValidLocalDate, 'Not a real calendar date');
const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm');
const optionalText = (max: number) => z.string().trim().max(max).optional();
const reminders = z.array(z.number().int().refine((o) => (REMINDER_OFFSETS as readonly number[]).includes(o), `Use one of ${REMINDER_OFFSETS.join(', ')} minutes`)).max(REMINDER_OFFSETS.length);
const checklist = z.array(z.object({ id: z.string().max(40).optional(), label: text(120), done: z.boolean().optional() }).strict()).max(20);
const referenceUrl = z.string().trim().max(1000).refine((u) => u === '' || /^https?:\/\/\S+$/i.test(u), 'Use a full http(s) link').optional();
const goal = z.enum(['reach', 'engagement', 'followers', 'traffic', 'sales', 'community', 'other']);
const legacyCreate = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']), time: text(20), platform, contentType: text(30).optional(), title: text(300),
}).strict();
const planTarget = z.object({
  platform, format: z.enum(ALL_PLAN_FORMATS as [string, ...string[]]), localDate: localDate.optional(), localTime: localTime.optional(),
  caption: optionalText(5000), reminders: reminders.optional(), checklist: checklist.optional(),
}).strict();
const planCreate = z.object({
  title: text(300), description: optionalText(2000), caption: optionalText(5000), cta: optionalText(300), referenceUrl, notes: optionalText(2000), goal: goal.optional(),
  status: z.enum(['idea', 'draft', 'planned', 'ready']).optional(), timezone,
  targets: z.array(planTarget).min(1).max(4),
  source: z.object({ mediaId: text(200), analysisType: z.enum(['deep', 'why_top', 'why_bottom']), recommendationIndex: z.number().int().min(0).max(9) }).strict().optional(),
}).strict();

export const planner = {
  /** The original weekday/time body (web planner) or a Planner V2 body with real dates and one or more platforms. */
  create: z.union([legacyCreate, planCreate]),
  list: z.union([
    z.object({ from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }) }).strict(),
    z.object({ undated: z.literal('true').transform(() => true) }).strict(),
  ]),
  update: z.object({
    title: text(300).optional(), description: optionalText(2000), caption: optionalText(5000), cta: optionalText(300), referenceUrl, notes: optionalText(2000), goal: goal.nullable().optional(),
    format: z.enum(ALL_PLAN_FORMATS as [string, ...string[]]).optional(), localDate: localDate.optional(), localTime: localTime.optional(), timezone: timezone.optional(),
    clearDate: z.literal(true).optional(), reminders: reminders.optional(), checklist: checklist.optional(),
  }).strict().refine((v) => Object.keys(v).length > 0, 'Provide at least one field'),
  status: z.object({ status: z.enum(['idea', 'draft', 'planned', 'ready', 'cancelled']), localDate: localDate.optional(), localTime: localTime.optional(), timezone: timezone.optional() }).strict(),
  publish: z.object({ mediaId: text(200).optional(), url: z.string().trim().max(1000).regex(/^https?:\/\/\S+$/i, 'Use a full http(s) link').optional(), publishedAt: z.string().datetime({ offset: true }).optional() }).strict(),
  idParams: z.object({ id: objectId }).strict(),
  recParams: z.object({ id: z.string().min(1).max(200) }).strict(),
  plan: z.object({ day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(), time: text(20).optional() }).strict().default({}),
  bestTimes: z.object({
    platform: z.enum(['instagram', 'facebook', 'youtube', 'linkedin', 'all']),
    days: z.enum(['30', '60', '90']).default('90').transform(Number),
    metric: z.enum(['engagementRate', 'reach', 'views']).optional(),
    contentType: z.enum(['all', 'reel', 'short', 'video', 'post', 'article', 'carousel']).optional(),
  }).strict(),
};

export const notifications = {
  list: pageQuery.extend({ unreadOnly: z.enum(['true', 'false']).transform((v) => v === 'true').optional() }).strict(),
  idParams: z.object({ id: objectId }).strict(),
};

export const files = {
  upload: z.object({ purpose: z.enum(['avatar', 'media', 'document']).default('document') }).strict(),
  list: pageQuery.strict(),
  idParams: z.object({ id: objectId }).strict(),
};

export const admin = {
  users: pageQuery.extend({ search: z.string().trim().max(100).optional() }).strict(),
  idParams: z.object({ id: objectId }).strict(),
  role: z.object({ role: z.enum(['user', 'admin']) }).strict(),
  status: z.object({ status: z.enum(['active', 'disabled']) }).strict(),
  credits: z.object({ amount: z.number().int().min(-1000).max(1000) }).strict(),
  connections: pageQuery.extend({ status: z.string().max(40).optional(), platform: platform.optional() }).strict(),
  syncRuns: pageQuery.extend({ status: z.enum(['queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled']).optional(), platform: platform.optional() }).strict(),
  audit: pageQuery.extend({ action: z.string().max(80).optional() }).strict(),
};
