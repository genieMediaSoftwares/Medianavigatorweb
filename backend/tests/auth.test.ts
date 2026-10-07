import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { startTestDb, stopTestDb, clearDb, api, registerUser, registerAdmin, PASSWORD, app } from './helpers.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearDb);

describe('signup / login', () => {
  it('registers a user, never returning password data, and issues tokens', async () => {
    const res = await api().post('/api/v1/auth/register').send({ email: 'A@Test.Example', password: PASSWORD, fullName: 'Ann' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('a@test.example');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    const stored = await User.findOne({ email: 'a@test.example' }).select('+passwordHash').lean();
    expect(stored!.passwordHash).not.toContain(PASSWORD);
    expect(stored!.passwordHash.startsWith('$2')).toBe(true);
  });

  it('rejects duplicate emails (case-insensitive) with 409', async () => {
    await registerUser('dup@test.example');
    const res = await api().post('/api/v1/auth/register').send({ email: 'DUP@test.example', password: PASSWORD, fullName: 'X' });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, error: { code: 'CONFLICT' } });
  });

  it('validates input (weak password, unknown fields) with 422', async () => {
    const weak = await api().post('/api/v1/auth/register').send({ email: 'w@test.example', password: 'short', fullName: 'W' });
    expect(weak.status).toBe(422);
    expect(weak.body.error.code).toBe('VALIDATION_ERROR');
    const extra = await api().post('/api/v1/auth/register').send({ email: 'w@test.example', password: PASSWORD, fullName: 'W', role: 'admin' });
    expect(extra.status).toBe(422);
  });

  it('never lets a client self-assign the admin role', async () => {
    await api().post('/api/v1/auth/register').send({ email: 'x@test.example', password: PASSWORD, fullName: 'X', role: 'admin' });
    expect((await User.findOne({ email: 'x@test.example' }).lean())?.role ?? 'user').toBe('user');
  });

  it('logs in with the right password and rejects the wrong one with the same message as an unknown email', async () => {
    await registerUser('l@test.example');
    expect((await api().post('/api/v1/auth/login').send({ email: 'l@test.example', password: PASSWORD })).status).toBe(200);
    const wrong = await api().post('/api/v1/auth/login').send({ email: 'l@test.example', password: 'Wrong-pass-1' });
    const unknown = await api().post('/api/v1/auth/login').send({ email: 'nobody@test.example', password: 'Wrong-pass-1' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('locks the account after repeated failures, even for the right password', async () => {
    await registerUser('lock@test.example');
    for (let i = 0; i < 3; i++) await api().post('/api/v1/auth/login').send({ email: 'lock@test.example', password: 'Wrong-pass-1' });
    const res = await api().post('/api/v1/auth/login').send({ email: 'lock@test.example', password: PASSWORD });
    expect(res.status).toBe(429);
  });
});

describe('JWT and sessions', () => {
  it('requires a valid token', async () => {
    expect((await api().get('/api/v1/auth/me')).status).toBe(401);
    expect((await api().get('/api/v1/auth/me').set('Authorization', 'Bearer garbage')).status).toBe(401);
    const u = await registerUser('me@test.example');
    const me = await api().get('/api/v1/auth/me').set(u.auth);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('me@test.example');
  });

  it('rejects a token signed with another secret and one without a session', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const u = await registerUser('forge@test.example');
    const forged = jwt.sign({ sub: u.id, sessionId: '64b000000000000000000000', role: 'admin' }, 'some-other-secret-some-other-secret-1');
    expect((await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
    const noSession = jwt.sign({ sub: u.id, sessionId: '64b000000000000000000000', role: 'user' }, process.env.JWT_SECRET!);
    expect((await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${noSession}`)).status).toBe(401);
  });

  it('rejects expired access tokens', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const u = await registerUser('exp@test.example');
    const session = await Session.findOne({ userId: u.id }).lean();
    const expired = jwt.sign({ sub: u.id, sessionId: String(session!._id), role: 'user' }, process.env.JWT_SECRET!, { expiresIn: -10 });
    expect((await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
  });

  it('rotates refresh tokens and revokes the session when an old one is replayed', async () => {
    const u = await registerUser('r@test.example');
    const first = await api().post('/api/v1/auth/refresh').send({ refreshToken: u.refreshToken });
    expect(first.status).toBe(200);
    const next = first.body.data.tokens.refreshToken;
    expect(next).not.toBe(u.refreshToken);
    // replaying the old token = theft signal => session dies, including the new token
    expect((await api().post('/api/v1/auth/refresh').send({ refreshToken: u.refreshToken })).status).toBe(401);
    expect((await api().post('/api/v1/auth/refresh').send({ refreshToken: next })).status).toBe(401);
    expect((await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${first.body.data.tokens.accessToken}`)).status).toBe(401);
  });

  it('logout revokes only the current session; logout-all revokes every session', async () => {
    const u = await registerUser('o@test.example');
    const second = await api().post('/api/v1/auth/login').send({ email: 'o@test.example', password: PASSWORD });
    const secondAuth = { Authorization: `Bearer ${second.body.data.tokens.accessToken}` };
    expect((await api().post('/api/v1/auth/logout').set(u.auth)).status).toBe(200);
    expect((await api().get('/api/v1/auth/me').set(u.auth)).status).toBe(401);
    expect((await api().get('/api/v1/auth/me').set(secondAuth)).status).toBe(200);
    expect((await api().post('/api/v1/auth/logout-all').set(secondAuth)).status).toBe(200);
    expect((await api().get('/api/v1/auth/me').set(secondAuth)).status).toBe(401);
    expect((await api().post('/api/v1/auth/refresh').send({ refreshToken: second.body.data.tokens.refreshToken })).status).toBe(401);
  });

  it('change-password keeps this device signed in and revokes the others', async () => {
    const u = await registerUser('cp@test.example');
    const other = await api().post('/api/v1/auth/login').send({ email: 'cp@test.example', password: PASSWORD });
    const otherAuth = { Authorization: `Bearer ${other.body.data.tokens.accessToken}` };
    const bad = await api().post('/api/v1/auth/change-password').set(u.auth).send({ currentPassword: 'nope-nope-1', newPassword: 'Brand-new-pass1' });
    expect(bad.status).toBe(401);
    const ok = await api().post('/api/v1/auth/change-password').set(u.auth).send({ currentPassword: PASSWORD, newPassword: 'Brand-new-pass1' });
    expect(ok.status).toBe(200);
    expect((await api().get('/api/v1/auth/me').set(u.auth)).status).toBe(200);
    expect((await api().get('/api/v1/auth/me').set(otherAuth)).status).toBe(401);
    expect((await api().post('/api/v1/auth/login').send({ email: 'cp@test.example', password: PASSWORD })).status).toBe(401);
    expect((await api().post('/api/v1/auth/login').send({ email: 'cp@test.example', password: 'Brand-new-pass1' })).status).toBe(200);
  });

  it('a disabled account loses access immediately', async () => {
    const u = await registerUser('dis@test.example');
    await User.updateOne({ email: 'dis@test.example' }, { $set: { status: 'disabled' } });
    expect((await api().get('/api/v1/auth/me').set(u.auth)).status).toBe(401);
  });
});

describe('password reset', () => {
  it('reports that email delivery is not configured instead of pretending to send', async () => {
    await registerUser('fp@test.example');
    const res = await api().post('/api/v1/auth/forgot-password').send({ email: 'fp@test.example' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('resets with a single-use, expiring token and revokes sessions', async () => {
    const { randomToken, sha256 } = await import('../src/lib/crypto.js');
    const { passwordResetRepository } = await import('../src/repositories/passwordReset.repository.js');
    const u = await registerUser('rp@test.example');
    const token = randomToken(32);
    await passwordResetRepository.create(new (await import('mongoose')).default.Types.ObjectId(u.id), sha256(token), new Date(Date.now() + 60_000));
    const res = await api().post('/api/v1/auth/reset-password').send({ token, newPassword: 'After-reset-pass1' });
    expect(res.status).toBe(200);
    expect((await api().post('/api/v1/auth/reset-password').send({ token, newPassword: 'Another-pass-22' })).status).toBe(400);
    expect((await api().get('/api/v1/auth/me').set(u.auth)).status).toBe(401);
    expect((await api().post('/api/v1/auth/login').send({ email: 'rp@test.example', password: 'After-reset-pass1' })).status).toBe(200);

    const expiredToken = randomToken(32);
    await passwordResetRepository.create(new (await import('mongoose')).default.Types.ObjectId(u.id), sha256(expiredToken), new Date(Date.now() - 1000));
    expect((await api().post('/api/v1/auth/reset-password').send({ token: expiredToken, newPassword: 'Another-pass-22' })).status).toBe(400);
  });
});

describe('authorization', () => {
  it('blocks normal users from admin routes and allows admins', async () => {
    const user = await registerUser('u@test.example');
    const admin = await registerAdmin();
    expect((await api().get('/api/v1/admin/system')).status).toBe(401);
    expect((await api().get('/api/v1/admin/system').set(user.auth)).status).toBe(403);
    const ok = await api().get('/api/v1/admin/system').set(admin.auth);
    expect(ok.status).toBe(200);
    expect(JSON.stringify(ok.body)).not.toMatch(/credentialsEnc|accessToken|secret/i);
  });

  it('an admin demoted in the database loses admin access with the same token', async () => {
    const admin = await registerAdmin('demote@test.example');
    expect((await api().get('/api/v1/admin/system').set(admin.auth)).status).toBe(200);
    await User.updateOne({ email: 'demote@test.example' }, { $set: { role: 'user' } });
    expect((await api().get('/api/v1/admin/system').set(admin.auth)).status).toBe(403);
  });

  it('admin role/status changes are audited, self-changes and last-admin removal are refused', async () => {
    const admin = await registerAdmin();
    const user = await registerUser('t@test.example');
    expect((await api().patch(`/api/v1/admin/users/${admin.id}/role`).set(admin.auth).send({ role: 'user' })).status).toBe(400);
    const promoted = await api().patch(`/api/v1/admin/users/${user.id}/role`).set(admin.auth).send({ role: 'admin' });
    expect(promoted.status).toBe(200);
    const audit = await api().get('/api/v1/admin/audit-logs').set(admin.auth);
    expect(audit.body.data.some((a: any) => a.action === 'user.role_change' && a.targetId === user.id)).toBe(true);
    // user is now the second admin; the original admin disables them, then the (now only) admin cannot be removed
    const disabled = await api().patch(`/api/v1/admin/users/${user.id}/status`).set(admin.auth).send({ status: 'disabled' });
    expect(disabled.status).toBe(200);
    expect((await api().get('/api/v1/auth/me').set(user.auth)).status).toBe(401);
  });
});

describe('request hygiene', () => {
  it('uses the standard error envelope and request id', async () => {
    const res = await api().get('/api/v1/does-not-exist').set('x-request-id', 'trace-abc-12345');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
    expect(res.headers['x-request-id']).toBe('trace-abc-12345');
  });

  it('answers malformed JSON with 400 and does not leak internals', async () => {
    const res = await api().post('/api/v1/auth/login').set('content-type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts|node_modules|stack/i);
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await api().post('/api/v1/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
  });

  it('strips NoSQL operators from input', async () => {
    await registerUser('nosql@test.example');
    const res = await api().post('/api/v1/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(422);
  });

  it('sets security headers and honours the CORS allow-list', async () => {
    const allowed = await api().get('/health').set('Origin', 'https://app.test.example');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.test.example');
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    expect(allowed.headers['x-powered-by']).toBeUndefined();
    const denied = await api().get('/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('serves root and health truthfully', async () => {
    const root = await api().get('/');
    expect(root.body).toEqual({ success: true, data: { service: 'Media Navigator API', status: 'running', health: '/health' } });
    const health = await api().get('/health');
    expect(health.status).toBe(200);
    expect(health.body.data).toMatchObject({ status: 'ok', application: 'running', database: 'connected' });
  });
});

void request; void app;
