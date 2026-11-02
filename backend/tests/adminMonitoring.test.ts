import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
const providerCall = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', async (original) => ({ ...await original<typeof import('@google/genai')>(), GoogleGenAI: class { models = { generateContent: providerCall }; } }));
import { api, clearDb, registerAdmin, registerUser, startTestDb, stopTestDb } from './helpers.js';
import { AiUsage, SystemError } from '../src/models/AdminTelemetry.js';
import { userRepository } from '../src/repositories/user.repository.js';
import { adminService } from '../src/services/admin.service.js';
import { generateJson } from '../src/services/ai/geminiClient.js';
beforeAll(startTestDb); afterAll(stopTestDb); beforeEach(clearDb);
describe('shared admin monitoring', () => {
  it('requires authentication and the current database admin role', async () => {
    const user = await registerUser('user@monitor.example');
    for (const path of ['monitoring', 'errors', 'permissions', 'system']) {
      expect((await api().get(`/api/v1/admin/${path}`)).status).toBe(401);
      expect((await api().get(`/api/v1/admin/${path}`).set(user.auth)).status).toBe(403);
    }
    const admin = await registerAdmin();
    expect((await api().get('/api/v1/admin/permissions').set(admin.auth)).status).toBe(200);
    await userRepository.setRole(admin.id, 'user');
    expect((await api().get('/api/v1/admin/monitoring').set(admin.auth)).status).toBe(403);
  });
  it('returns recorded attempts and explicitly unavailable billing data', async () => {
    const admin = await registerAdmin();
    await AiUsage.create([{ operation: 'json', model: 'recorded-model', status: 'succeeded', latencyMs: 100 }, { operation: 'multimodal', model: 'recorded-model', status: 'failed', latencyMs: 200, reason: 'timeout' }]);
    const res = await api().get('/api/v1/admin/monitoring').set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.ai.calls).toEqual(expect.arrayContaining([expect.objectContaining({ _id: 'succeeded', count: 1 }), expect.objectContaining({ _id: 'failed', count: 1 })]));
    expect(res.body.data.ai.tokens).toBeNull(); expect(res.body.data.ai.cost).toBeNull();
    expect(res.body.data.billing.subscriptionsImplemented).toBe(false);
    expect(res.body.data.billing.chargingEnabled).toBe(false);
    expect(res.body.data.billing.creditRules).toBeNull();
    expect(res.body.data.analytics.snapshots).toBe(0);
    expect(res.body.data.analytics.latestSnapshot).toBeNull();
    expect(res.body.data.workers).toMatchObject({ tasks: [], pendingAccountCleanups: 0, oldestPendingCleanupAt: null });
  });
  it('reports the latest worker heartbeat per task and pending account cleanups', async () => {
    const admin = await registerAdmin();
    const { WorkerHeartbeat } = await import('../src/models/WorkerHeartbeat.js');
    const { AccountDeletion } = await import('../src/models/AccountDeletion.js');
    const older = new Date(Date.now() - 600_000), newer = new Date(Date.now() - 5_000);
    await WorkerHeartbeat.create([{ instance: 'web-1', task: 'deep_analysis', lastSucceededAt: older }, { instance: 'worker-1', task: 'deep_analysis', lastSucceededAt: newer }, { instance: 'worker-1', task: 'social_sync', lastSucceededAt: older }]);
    await AccountDeletion.create([{ userId: admin.id, status: 'queued' }, { userId: (await registerUser('gone@monitor.example')).id, status: 'complete' }]);
    const { workers } = (await api().get('/api/v1/admin/monitoring').set(admin.auth)).body.data;
    expect(workers.tasks).toEqual([
      { task: 'deep_analysis', lastSucceededAt: newer.toISOString(), instances: 2 },
      { task: 'social_sync', lastSucceededAt: older.toISOString(), instances: 1 },
    ]);
    expect(workers.pendingAccountCleanups).toBe(1);
    expect(JSON.stringify(workers)).not.toContain(admin.id);
  });
  it('returns metadata-only error records', async () => {
    const admin = await registerAdmin();
    await SystemError.create({ code: 'INTERNAL_ERROR', status: 500, method: 'GET', route: '/example/:id', requestId: 'request-123' });
    const res = await api().get('/api/v1/admin/errors').set(admin.auth);
    expect(res.status).toBe(200); expect(res.body.data.server).toHaveLength(1);
    expect(res.body.data.server[0].requestId).toBe('request-123');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|accessToken|refreshToken|credentialsEnc/);
  });
  it('applies concurrent admin credit adjustments atomically', async () => {
    const admin = await registerAdmin(); const user = await registerUser('credits@monitor.example');
    await Promise.all([adminService.adjustCredits({ userId: admin.id }, user.id, 10), adminService.adjustCredits({ userId: admin.id }, user.id, 20)]);
    expect((await userRepository.findById(user.id))?.credits).toBe(80);
  });
  it('records actual Gemini success and failure attempts without prompt payloads', async () => {
    providerCall.mockResolvedValueOnce({ text: '{"ok":true}' });
    const opts = { system: 'private system instructions', prompt: 'private customer prompt', schema: z.object({ ok: z.boolean() }) };
    expect((await generateJson(opts)).data.ok).toBe(true);
    providerCall.mockRejectedValueOnce(new Error('private provider payload'));
    await expect(generateJson(opts)).rejects.toThrow('could not process');
    await vi.waitFor(async () => expect(await AiUsage.countDocuments()).toBe(2));
    const rows = await AiUsage.find().lean();
    expect(rows.map(row => row.status).sort()).toEqual(['failed', 'succeeded']);
    expect(JSON.stringify(rows)).not.toMatch(/private|prompt|payload/);
  });
});
