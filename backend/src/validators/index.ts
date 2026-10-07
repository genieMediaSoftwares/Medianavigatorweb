import { z } from 'zod';
import { pageQuery } from '../lib/pagination.js';
import { isObjectId } from '../lib/ids.js';

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
  profile: z.object({ fullName: text(120).optional(), organization: text(160).optional(), accountType: text(60).optional(), timezone: timezone.optional(), onboardingCompleted: z.boolean().optional() }).strict()
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
  lookup: z.object({ apiKey: credential.optional(), accessToken: credential.optional(), channelQuery: z.string().trim().max(200).optional(), channelId: z.string().trim().max(200).optional() }).strict()
    .refine((v) => v.apiKey || v.accessToken, 'apiKey or accessToken is required'),
  oauthCallback: z.object({ code: z.string().min(1).max(2048).optional(), state: z.string().min(10).max(200), error: z.string().max(200).optional(), error_description: z.string().max(500).optional() }).passthrough(),
};

export const media = {
  list: pageQuery.extend({ platform: z.enum(['all', 'instagram', 'facebook', 'youtube', 'linkedin']).optional() }).strict(),
  params: z.object({ id: z.string().min(1).max(200) }).strict(),
};

export const intelligence = {
  summary: z.object({ platform: platform.optional(), days: z.coerce.number().int().min(7).max(365).default(30) }).strict(),
  performers: z.object({ sortBy: z.enum(['views', 'engagement', 'likes', 'comments']).default('views') }).strict(),
  history: z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), platform: platform.optional(), limit: z.coerce.number().int().min(1).max(366).default(90) }).strict(),
  ask: z.object({ question: z.string().trim().min(2).max(500) }).strict(),
  item: z.object({ mediaId: z.string().min(1).max(200) }).strict(),
  diagnose: z.object({ mediaId: z.string().min(1).max(200), forcedStatus: z.enum(['working', 'underperforming', 'average']).optional() }).strict(),
  compare: z.object({ mediaIdA: z.string().min(1).max(200), mediaIdB: z.string().min(1).max(200) }).strict(),
};

export const planner = {
  create: z.object({
    day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']), time: text(20), platform, contentType: text(30).optional(), title: text(300),
  }).strict(),
  idParams: z.object({ id: objectId }).strict(),
  recParams: z.object({ id: z.string().min(1).max(200) }).strict(),
  plan: z.object({ day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(), time: text(20).optional() }).strict().default({}),
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
  connections: pageQuery.extend({ status: z.string().max(40).optional(), platform: platform.optional() }).strict(),
  syncRuns: pageQuery.extend({ status: z.enum(['queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled']).optional(), platform: platform.optional() }).strict(),
  audit: pageQuery.extend({ action: z.string().max(80).optional() }).strict(),
};
