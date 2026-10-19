import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';
import { isValidLocalDate, utcToZoned, weekdayOf, zonedToUtc } from '../src/lib/zonedTime.js';
import {
  canTransition, defaultChecklist, dueReminders, effectiveStatus, formatFromLegacy, MISSED_GRACE_MS, reminderKey, REMINDER_STALE_MS,
} from '../src/services/planner/plans.js';
import { sendDueReminders } from '../src/jobs/planner/reminders.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';
import { ContentItem } from '../src/models/ContentItem.js';
import { ContentAnalysis } from '../src/models/ContentAnalysis.js';
import { Notification } from '../src/models/Notification.js';
import { PlannedContentModel } from '../src/models/PlannedContent.js';

describe('zoned time', () => {
  it('converts a local time to an instant and back', () => {
    const { date, shifted } = zonedToUtc('2026-10-20', '18:30', 'Asia/Kolkata');
    expect(date.toISOString()).toBe('2026-10-20T13:00:00.000Z');
    expect(shifted).toBe(false);
    expect(utcToZoned(date, 'Asia/Kolkata')).toEqual({ localDate: '2026-10-20', localTime: '18:30', weekday: 'Tuesday' });
  });

  it('crosses day, month and year boundaries', () => {
    expect(zonedToUtc('2027-01-01', '01:00', 'Asia/Kolkata').date.toISOString()).toBe('2026-12-31T19:30:00.000Z');
    expect(zonedToUtc('2026-10-31', '23:30', 'America/Los_Angeles').date.toISOString()).toBe('2026-11-01T06:30:00.000Z');
  });

  it('follows daylight saving instead of a fixed offset', () => {
    // New York: EDT (UTC-4) before 2026-11-01, EST (UTC-5) after.
    expect(zonedToUtc('2026-10-31', '09:00', 'America/New_York').date.toISOString()).toBe('2026-10-31T13:00:00.000Z');
    expect(zonedToUtc('2026-11-02', '09:00', 'America/New_York').date.toISOString()).toBe('2026-11-02T14:00:00.000Z');
  });

  it('resolves a repeated hour to its first occurrence and moves a skipped hour forward', () => {
    // 01:30 happens twice on 2026-11-01 in New York; the first is EDT.
    expect(zonedToUtc('2026-11-01', '01:30', 'America/New_York').date.toISOString()).toBe('2026-11-01T05:30:00.000Z');
    // 02:30 doesn't exist on 2026-03-08; it becomes 03:30 EDT.
    const gap = zonedToUtc('2026-03-08', '02:30', 'America/New_York');
    expect(gap.shifted).toBe(true);
    expect(utcToZoned(gap.date, 'America/New_York').localTime).toBe('03:30');
  });

  it('rejects impossible dates and unknown zones', () => {
    expect(isValidLocalDate('2026-02-30')).toBe(false);
    expect(isValidLocalDate('2028-02-29')).toBe(true);
    expect(() => zonedToUtc('2026-02-30', '10:00', 'UTC')).toThrow();
    expect(() => zonedToUtc('2026-02-10', '10:00', 'Mars/Base')).toThrow();
    expect(weekdayOf('2026-10-19')).toBe('Monday');
  });
});

describe('planner rules', () => {
  it('only allows real lifecycle transitions', () => {
    expect(canTransition('planned', 'ready')).toBe(true);
    expect(canTransition('ready', 'published')).toBe(true);
    expect(canTransition('draft', 'idea')).toBe(true);
    expect(canTransition('idea', 'published')).toBe(false);
    expect(canTransition('published', 'cancelled')).toBe(false);
    expect(canTransition('cancelled', 'ready')).toBe(false);
  });

  it('derives missed only after the grace period and never for published or cancelled plans', () => {
    const at = new Date('2026-10-19T10:00:00Z');
    const later = new Date(at.getTime() + MISSED_GRACE_MS + 1);
    expect(effectiveStatus('planned', at, new Date(at.getTime() + 60_000))).toBe('planned');
    expect(effectiveStatus('planned', at, later)).toBe('missed');
    expect(effectiveStatus('ready', at, later)).toBe('missed');
    expect(effectiveStatus('published', at, later)).toBe('published');
    expect(effectiveStatus('cancelled', at, later)).toBe('cancelled');
    expect(effectiveStatus('idea', null, later)).toBe('idea');
  });

  it('gives format-specific checklists and maps legacy formats without guessing', () => {
    expect(defaultChecklist('reel')).toContain('Cover selected');
    expect(defaultChecklist('carousel')).toContain('Slide order reviewed');
    expect(defaultChecklist('text')).toContain('Links checked');
    expect(formatFromLegacy('instagram', 'Post')).toBe('image');
    expect(formatFromLegacy('linkedin', 'post')).toBe('text');
    expect(formatFromLegacy('youtube', 'carousel')).toBeNull();
  });

  it('fires each reminder once in its window and skips outdated ones', () => {
    const at = new Date('2026-10-19T18:00:00Z');
    const plan = { id: 'p1', status: 'planned' as const, scheduledAt: at, reminders: [0, 15, 1440, 15] };
    expect(dueReminders(plan, new Date(at.getTime() - 20 * 60_000))).toEqual([]);
    expect(dueReminders(plan, new Date(at.getTime() - 14 * 60_000)).map((r) => r.offset)).toEqual([15]);
    expect(dueReminders(plan, new Date(at.getTime() + 60_000)).map((r) => r.offset)).toEqual([0]);
    // A day-before reminder discovered hours late is stale.
    expect(dueReminders(plan, new Date(at.getTime() - 1440 * 60_000 + REMINDER_STALE_MS + 1))).toEqual([]);
    expect(dueReminders({ ...plan, status: 'published' }, at)).toEqual([]);
    expect(dueReminders({ ...plan, scheduledAt: null }, at)).toEqual([]);
    expect(reminderKey('p1', 15, at)).not.toBe(reminderKey('p1', 15, new Date(at.getTime() + 60_000)));
  });
});

describe('planner V2 API', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(clearDb);

  const future = (days: number) => utcToZoned(new Date(Date.now() + days * 86_400_000), 'UTC').localDate;
  const create = (u: { auth: Record<string, string> }, body: Record<string, unknown>) => api().post('/api/v1/planner').set(u.auth).send(body);
  const plan = (targets: unknown[], extra: Record<string, unknown> = {}) => ({ title: 'Launch reel', timezone: 'UTC', targets, ...extra });

  async function account(userId: string, platform: 'instagram' | 'facebook', extra: Record<string, unknown> = {}) {
    return ConnectedAccount.create({
      userId: new Types.ObjectId(userId), platform, providerAccountId: `${platform}_${userId}`, handle: `@${platform}`, status: 'sync_complete', active: true, lastSyncedAt: new Date(), ...extra,
    });
  }
  async function post(userId: string, accountId: Types.ObjectId, i: number, publishedAt: Date, extra: Record<string, unknown> = {}) {
    return ContentItem.create({
      userId: new Types.ObjectId(userId), connectedAccountId: accountId, platform: 'instagram', providerMediaId: `m${i}`, legacyId: `ig_m${i}`, contentType: 'reel',
      title: `Post ${i}`, caption: '', mediaUrl: `https://instagram.example/p/m${i}`, publishedAt, views: 1000 + i * 100, reach: 800, likes: 50 + i, comments: 5, shares: 1,
      engagementRate: 5, unavailableMetrics: ['watchTimeMinutes'], normalized: {}, syncedAt: new Date(), ...extra,
    });
  }

  it('creates a dated plan with a real instant, default checklist and reminders', async () => {
    const u = await registerUser('v2a@test.example');
    const res = await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: '2030-03-08', localTime: '18:00', reminders: [60, 15] }], { timezone: 'America/New_York' }));
    expect(res.status).toBe(201);
    const p = res.body.data.plans[0];
    expect(p).toMatchObject({ status: 'planned', format: 'reel', localDate: '2030-03-08', localTime: '18:00', timezone: 'America/New_York', reminders: [60, 15], needsDate: false });
    expect(p.scheduledAt).toBe(zonedToUtc('2030-03-08', '18:00', 'America/New_York').date.toISOString());
    expect(p.checklist.map((c: any) => c.label)).toContain('Cover selected');
    expect(p.checklistDone).toBe(0);
    // Older clients still see a weekday and time.
    expect((await PlannedContentModel.findById(p.id).lean())!).toMatchObject({ day: 'Friday', time: '6:00 PM' });
  });

  it('validates formats, dates and statuses on the server', async () => {
    const u = await registerUser('v2b@test.example');
    expect((await create(u, plan([{ platform: 'youtube', format: 'reel', localDate: future(2), localTime: '10:00' }]))).status).toBe(422);
    expect((await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: '2030-02-30', localTime: '10:00' }]))).status).toBe(422);
    expect((await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: future(2) }]))).status).toBe(422);
    expect((await create(u, plan([{ platform: 'instagram', format: 'reel' }], { status: 'planned' }))).status).toBe(422);
    expect((await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: future(2), localTime: '25:00' }]))).status).toBe(422);
    expect((await create(u, plan([{ platform: 'instagram', format: 'reel' }], { timezone: 'Mars/Base' }))).status).toBe(422);
    expect((await create(u, plan([{ platform: 'instagram', format: 'reel' }, { platform: 'instagram', format: 'image' }]))).status).toBe(422);
    // Without a date it is an idea.
    const idea = await create(u, plan([{ platform: 'instagram', format: 'reel' }]));
    expect(idea.body.data.plans[0]).toMatchObject({ status: 'idea', scheduledAt: null });
  });

  it('plans one idea for several platforms, each with its own format, time and caption', async () => {
    const u = await registerUser('v2c@test.example');
    const res = await create(u, plan([
      { platform: 'instagram', format: 'reel', localDate: future(3), localTime: '18:00', caption: 'IG caption' },
      { platform: 'linkedin', format: 'document', localDate: future(4), localTime: '09:00' },
    ], { caption: 'Shared caption' }));
    const [ig, li] = res.body.data.plans;
    expect(res.body.data.groupId).toBeTruthy();
    expect(ig.groupId).toBe(li.groupId);
    expect(ig.caption).toBe('IG caption');
    expect(li.caption).toBe('Shared caption');
    expect(li.checklist.map((c: any) => c.label)).toContain('Slide order reviewed');
    const detail = await api().get(`/api/v1/planner/${ig.id}`).set(u.auth);
    expect(detail.body.data.group.map((g: any) => g.platform)).toEqual(['linkedin']);
  });

  it('lists a bounded date range earliest first, and undated plans separately', async () => {
    const u = await registerUser('v2d@test.example');
    await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: future(5), localTime: '09:00' }], { title: 'Later' }));
    await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: future(1), localTime: '20:00' }], { title: 'Sooner' }));
    await create(u, plan([{ platform: 'instagram', format: 'reel' }], { title: 'Idea' }));
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const range = await api().get('/api/v1/planner/plans').query({ from, to }).set(u.auth);
    expect(range.body.data.map((p: any) => p.title)).toEqual(['Sooner', 'Later']);
    const undated = await api().get('/api/v1/planner/plans').query({ undated: 'true' }).set(u.auth);
    expect(undated.body.data.map((p: any) => p.title)).toEqual(['Idea']);
    const tooWide = await api().get('/api/v1/planner/plans').query({ from, to: new Date(Date.now() + 400 * 86_400_000).toISOString() }).set(u.auth);
    expect(tooWide.status).toBe(422);
  });

  it('keeps legacy weekday-only plans as they are and asks for a date instead of inventing one', async () => {
    const u = await registerUser('v2e@test.example');
    const legacy = await create(u, { day: 'Monday', time: '1:00 PM', platform: 'instagram', title: 'Old plan' });
    expect(legacy.status).toBe(201);
    expect(legacy.body.data).toMatchObject({ day: 'Monday', time: '1:00 PM', status: 'planned' });
    const [p] = (await api().get('/api/v1/planner/plans').query({ undated: 'true' }).set(u.auth)).body.data;
    expect(p).toMatchObject({ needsDate: true, scheduledAt: null, legacy: { day: 'Monday', time: '1:00 PM' }, format: 'image' });
    expect((await api().get('/api/v1/planner').set(u.auth)).body.data).toHaveLength(1);
    // Picking a date turns it into a dated plan.
    const dated = await api().post(`/api/v1/planner/${p.id}/status`).set(u.auth).send({ status: 'planned', localDate: future(2), localTime: '13:00', timezone: 'UTC' });
    expect(dated.body.data).toMatchObject({ needsDate: false, localTime: '13:00' });
  });

  it('edits, reschedules, moves through statuses and persists the checklist', async () => {
    const u = await registerUser('v2f@test.example');
    const [p] = (await create(u, plan([{ platform: 'instagram', format: 'image', localDate: future(2), localTime: '10:00' }]))).body.data.plans;
    const edited = await api().patch(`/api/v1/planner/${p.id}`).set(u.auth).send({
      title: 'New title', localTime: '11:30', checklist: [{ id: p.checklist[0].id, label: p.checklist[0].label, done: true }, { label: 'Tag partner' }],
    });
    expect(edited.status).toBe(200);
    expect(edited.body.data).toMatchObject({ title: 'New title', localTime: '11:30', checklistDone: 1 });
    expect(edited.body.data.checklist).toHaveLength(2);
    expect(edited.body.data.checklist[1]).toMatchObject({ label: 'Tag partner', done: false });
    expect((await api().post(`/api/v1/planner/${p.id}/status`).set(u.auth).send({ status: 'ready' })).body.data.status).toBe('ready');
    expect((await api().post(`/api/v1/planner/${p.id}/status`).set(u.auth).send({ status: 'published' })).status).toBe(422);
    const idea = await api().post(`/api/v1/planner/${p.id}/status`).set(u.auth).send({ status: 'idea' });
    expect(idea.body.data).toMatchObject({ status: 'idea', scheduledAt: null });
    expect((await api().patch(`/api/v1/planner/${p.id}`).set(u.auth).send({ localDate: future(3) })).status).toBe(422);
    expect((await api().post(`/api/v1/planner/${p.id}/status`).set(u.auth).send({ status: 'planned' })).status).toBe(422);
  });

  it('reports a passed plan as missed and lets it be rescheduled', async () => {
    const u = await registerUser('v2g@test.example');
    const [p] = (await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: future(-2), localTime: '10:00' }]))).body.data.plans;
    expect(p.status).toBe('missed');
    expect(p.storedStatus).toBe('planned');
    const moved = await api().patch(`/api/v1/planner/${p.id}`).set(u.auth).send({ localDate: future(2) });
    expect(moved.body.data.status).toBe('planned');
  });

  it('never exposes another user’s plans', async () => {
    const a = await registerUser('v2h1@test.example');
    const b = await registerUser('v2h2@test.example');
    const [p] = (await create(a, plan([{ platform: 'instagram', format: 'reel' }]))).body.data.plans;
    expect((await api().get(`/api/v1/planner/${p.id}`).set(b.auth)).status).toBe(404);
    expect((await api().patch(`/api/v1/planner/${p.id}`).set(b.auth).send({ title: 'x' })).status).toBe(404);
    expect((await api().post(`/api/v1/planner/${p.id}/status`).set(b.auth).send({ status: 'draft' })).status).toBe(404);
    await api().delete(`/api/v1/planner/${p.id}`).set(b.auth);
    expect((await api().get(`/api/v1/planner/${p.id}`).set(a.auth)).status).toBe(200);
    expect((await api().get('/api/v1/planner/plans').query({ undated: 'true' })).status).toBe(401);
  });

  it('delivers reminders once, re-arms them after a reschedule and stops for cancelled or deleted plans', async () => {
    const u = await registerUser('v2i@test.example');
    const now = new Date();
    const inTen = utcToZoned(new Date(now.getTime() + 10 * 60_000), 'UTC');
    const [p] = (await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: inTen.localDate, localTime: inTen.localTime, reminders: [15, 0] }]))).body.data.plans;
    expect(await sendDueReminders(now)).toBe(1);
    expect(await sendDueReminders(now)).toBe(0);
    const n = await Notification.find({ type: 'plan_reminder' }).lean();
    expect(n).toHaveLength(1);
    expect(n[0].data).toMatchObject({ planId: p.id, offset: 15 });
    expect(n[0].title).toContain('Launch reel');

    // Moving the plan makes a fresh reminder for the new time.
    const inTwenty = utcToZoned(new Date(now.getTime() + 12 * 60_000), 'UTC');
    await api().patch(`/api/v1/planner/${p.id}`).set(u.auth).send({ localTime: inTwenty.localTime, localDate: inTwenty.localDate });
    expect(await sendDueReminders(now)).toBe(1);

    await api().post(`/api/v1/planner/${p.id}/status`).set(u.auth).send({ status: 'cancelled' });
    expect(await sendDueReminders(new Date(now.getTime() + 13 * 60_000))).toBe(0);

    await api().delete(`/api/v1/planner/${p.id}`).set(u.auth);
    expect(await Notification.countDocuments({ type: 'plan_reminder' })).toBe(0);
  });

  it('suggests matching synced posts, links only on confirmation and prevents double claims', async () => {
    const u = await registerUser('v2j@test.example');
    const acc = await account(u.id, 'instagram');
    const at = new Date(Date.now() - 3 * 86_400_000);
    const when = utcToZoned(at, 'UTC');
    await post(u.id, acc._id, 1, new Date(at.getTime() + 20 * 60_000));
    await post(u.id, acc._id, 2, new Date(at.getTime() - 10 * 86_400_000)); // outside the window
    await post(u.id, acc._id, 3, new Date(at.getTime() + 60 * 60_000), { contentType: 'carousel', legacyId: 'ig_m3c' }); // other format
    const [a, b] = (await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: when.localDate, localTime: when.localTime }]))).body.data.plans
      .concat((await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: when.localDate, localTime: when.localTime }]))).body.data.plans);

    const m = await api().get(`/api/v1/planner/${a.id}/matches`).set(u.auth);
    expect(m.body.data.state).toBe('possible');
    expect(m.body.data.candidates.map((c: any) => c.mediaId)).toEqual(['ig_m1']);
    // Suggesting is not linking.
    expect((await api().get(`/api/v1/planner/${a.id}`).set(u.auth)).body.data.plan.publication).toBeNull();

    const linked = await api().post(`/api/v1/planner/${a.id}/publish`).set(u.auth).send({ mediaId: 'ig_m1' });
    expect(linked.body.data).toMatchObject({ status: 'published', publication: { verification: 'matched', mediaId: 'ig_m1' } });
    expect((await api().post(`/api/v1/planner/${b.id}/publish`).set(u.auth).send({ mediaId: 'ig_m1' })).status).toBe(409);
    expect((await api().get(`/api/v1/planner/${b.id}/matches`).set(u.auth)).body.data.state).toBe('none');
  });

  it('records manual publishing, and links by exact permalink only', async () => {
    const u = await registerUser('v2k@test.example');
    const acc = await account(u.id, 'instagram');
    await post(u.id, acc._id, 7, new Date(Date.now() - 86_400_000));
    const [a, b] = [
      (await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: future(1), localTime: '10:00' }]))).body.data.plans[0],
      (await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: future(1), localTime: '11:00' }]))).body.data.plans[0],
    ];
    const manual = await api().post(`/api/v1/planner/${a.id}/publish`).set(u.auth).send({ url: 'https://instagram.example/p/other' });
    expect(manual.body.data.publication).toMatchObject({ verification: 'manual', mediaId: null, url: 'https://instagram.example/p/other' });
    const byLink = await api().post(`/api/v1/planner/${b.id}/publish`).set(u.auth).send({ url: 'https://instagram.example/p/m7' });
    expect(byLink.body.data.publication).toMatchObject({ verification: 'matched', mediaId: 'ig_m7' });
    // Undo.
    const undone = await api().post(`/api/v1/planner/${a.id}/status`).set(u.auth).send({ status: 'ready' });
    expect(undone.body.data).toMatchObject({ status: 'ready', publication: null });
  });

  it('reports matching as unavailable when the platform isn’t connected or the format isn’t synced', async () => {
    const u = await registerUser('v2l@test.example');
    const [fb] = (await create(u, plan([{ platform: 'facebook', format: 'reel', localDate: future(1), localTime: '10:00' }]))).body.data.plans;
    expect((await api().get(`/api/v1/planner/${fb.id}/matches`).set(u.auth)).body.data).toMatchObject({ state: 'unavailable', reason: 'not_connected' });
    await account(u.id, 'instagram');
    const [story] = (await create(u, plan([{ platform: 'instagram', format: 'story', localDate: future(1), localTime: '10:00' }]))).body.data.plans;
    expect((await api().get(`/api/v1/planner/${story.id}/matches`).set(u.auth)).body.data).toMatchObject({ state: 'unavailable', reason: 'format_not_synced' });
  });

  it('reviews only measured results, compares with comparable posts and never turns missing numbers into zero', async () => {
    const u = await registerUser('v2m@test.example');
    const acc = await account(u.id, 'instagram');
    const base = Date.now() - 40 * 86_400_000;
    for (let i = 0; i < 6; i++) await post(u.id, acc._id, 10 + i, new Date(base + i * 86_400_000), { views: 1000 });
    await post(u.id, acc._id, 99, new Date(Date.now() - 5 * 86_400_000), { views: 1500, unavailableMetrics: ['watchTimeMinutes', 'reach'] });
    const [p] = (await create(u, plan([{ platform: 'instagram', format: 'reel', localDate: future(1), localTime: '10:00' }]))).body.data.plans;
    expect((await api().get(`/api/v1/planner/${p.id}/review`).set(u.auth)).body.data.state).toBe('not_published');
    await api().post(`/api/v1/planner/${p.id}/publish`).set(u.auth).send({ mediaId: 'ig_m99' });
    const r = (await api().get(`/api/v1/planner/${p.id}/review`).set(u.auth)).body.data;
    expect(r.state).toBe('ready');
    const views = r.metrics.find((m: any) => m.key === 'views');
    expect(views).toMatchObject({ value: 1500, comparison: { median: 1000, posts: 6, diffPct: 50 } });
    expect(r.metrics.find((m: any) => m.key === 'reach').value).toBeNull();
    expect(r.metrics.find((m: any) => m.key === 'watchTimeMinutes').value).toBeNull();
    expect(r.insightsAvailable).toBe(true);
  });

  it('plans an idea from a saved analysis recommendation and keeps only a short reference', async () => {
    const u = await registerUser('v2n@test.example');
    const analysis = await ContentAnalysis.create({
      userId: new Types.ObjectId(u.id), mediaId: 'ig_abc', platform: 'instagram', contentType: 'reel', analysisType: 'deep', analysisVersion: 'content-v8',
      result: { summary: 'The hook in the first second drove views.', recommendations: ['Open with the result in the first second', 'Second idea', 'Third idea'] },
    });
    const res = await create(u, plan([{ platform: 'instagram', format: 'reel' }], { title: 'Open with the result', source: { mediaId: 'ig_abc', analysisType: 'deep', recommendationIndex: 0 } }));
    expect(res.status).toBe(201);
    expect(res.body.data.plans[0].source).toMatchObject({ mediaId: 'ig_abc', recommendationText: 'Open with the result in the first second', analysisSummary: 'The hook in the first second drove views.' });
    const stored = await PlannedContentModel.findById(res.body.data.plans[0].id).lean();
    expect(String(stored!.source!.analysisId)).toBe(String(analysis._id));
    expect((await create(u, plan([{ platform: 'instagram', format: 'reel' }], { source: { mediaId: 'ig_abc', analysisType: 'deep', recommendationIndex: 7 } }))).status).toBe(404);
    // Another user can't plan from someone else's analysis.
    const other = await registerUser('v2n2@test.example');
    expect((await create(other, plan([{ platform: 'instagram', format: 'reel' }], { source: { mediaId: 'ig_abc', analysisType: 'deep', recommendationIndex: 0 } }))).status).toBe(404);
  });

  it('tells the client which permissions are missing in best times, even for a synced account', async () => {
    const u = await registerUser('v2o@test.example');
    await account(u.id, 'facebook', { missingPermissions: ['read_insights', 'pages_read_user_content'] });
    const res = await api().get('/api/v1/planner/best-times').query({ platform: 'facebook' }).set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.accounts.find((a: any) => a.platform === 'facebook')).toMatchObject({ status: 'sync_complete', missingPermissions: ['read_insights', 'pages_read_user_content'] });
  });
});
