import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api, clearDb, PASSWORD, registerAdmin, registerUser, startTestDb, stopTestDb } from './helpers.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearDb);

async function clients() {
  const user = await registerUser('all-clients@test.example');
  const devices = await Promise.all(['Website', 'Android', 'iOS'].map(async (device) => {
    const res = await api().post('/api/v1/auth/login').set('User-Agent', `MediaNavigator/${device}`).send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(200);
    return { Authorization: `Bearer ${res.body.data.tokens.accessToken}` };
  }));
  return { user, devices };
}

describe('one backend and administration for every client', () => {
  it('returns one account and shared profile preferences to website, Android and iOS', async () => {
    const { user, devices } = await clients();
    expect((await api().patch('/api/v1/profiles/me').set(devices[1]).send({ fullName: 'Shared profile', timezone: 'Asia/Kolkata', notificationPrefs: { syncUpdates: false } })).status).toBe(200);
    for (const auth of devices) {
      const result = await api().get('/api/v1/auth/me').set(auth);
      expect(result.body.data.user.id).toBe(user.id);
      expect(result.body.data.profile).toMatchObject({ fullName: 'Shared profile', timezone: 'Asia/Kolkata', notificationPrefs: { syncUpdates: false } });
    }
  });

  it('applies admin suspension immediately to every client session', async () => {
    const admin = await registerAdmin();
    const { user, devices } = await clients();
    expect((await api().patch(`/api/v1/admin/users/${user.id}/status`).set(admin.auth).send({ status: 'disabled' })).status).toBe(200);
    for (const auth of devices) expect((await api().get('/api/v1/auth/me').set(auth)).status).toBe(401);
    expect((await api().post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD })).status).toBe(401);
  });

  it('shows shared counts and honest configuration in the admin panel, while preserving user isolation', async () => {
    const admin = await registerAdmin();
    const { user, devices } = await clients();
    const system = await api().get('/api/v1/admin/system').set(admin.auth);
    expect(system.status).toBe(200);
    expect(system.body.data.counts.users).toBe(2);
    expect(system.body.data.features.email).toEqual({ configured: false, provider: null });
    expect(system.body.data.configurationChecks.find((check: { id: string }) => check.id === 'email').ready).toBe(false);
    expect((await api().get('/api/v1/admin/users').set(admin.auth)).body.data.filter((row: { id: string }) => row.id === user.id)).toHaveLength(1);
    for (const auth of devices) expect((await api().get('/api/v1/admin/system').set(auth)).status).toBe(403);
    expect(JSON.stringify(system.body)).not.toMatch(/credentialsEnc|test-secret|test-resend-key/);
  });
});
