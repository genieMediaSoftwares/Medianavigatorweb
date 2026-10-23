import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { config, buildConfig } from '../src/config/env.js';
import { sendPasswordResetEmail } from '../src/services/email.service.js';
import { api, clearDb, PASSWORD, registerUser, startTestDb, stopTestDb } from './helpers.js';
import { PasswordReset } from '../src/models/PasswordReset.js';
import { User } from '../src/models/User.js';

vi.mock('../src/config/env.js', async (original) => {
  const actual = await original<typeof import('../src/config/env.js')>();
  return { ...actual, config: { ...actual.config } };
});

const settings = config as { email: typeof config.email };
const previous = config.email;
const resend = { provider: 'resend' as const, apiKey: 'test-resend-key', from: 'Media Navigator <reset@test.example>' };
beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => { await clearDb(); settings.email = resend; });
afterEach(() => { settings.email = previous; vi.unstubAllGlobals(); });

describe('production reset email configuration', () => {
  it('accepts complete Resend settings and rejects incomplete or ambiguous providers', () => {
    const source = { ...process.env, RESEND_API_KEY: 'test-resend-key', EMAIL_FROM: 'Media Navigator <reset@test.example>' };
    expect(buildConfig(source).email?.provider).toBe('resend');
    expect(() => buildConfig({ ...source, EMAIL_FROM: '' })).toThrow(/EMAIL_FROM/);
    expect(() => buildConfig({ ...source, EMAIL_FROM: 'invalid' })).toThrow(/EMAIL_FROM/);
    expect(() => buildConfig({ ...source, SMTP_HOST: 'smtp.test.example', SMTP_PORT: '587', SMTP_USER: 'user', SMTP_PASSWORD: 'pass' })).toThrow(/either SMTP or Resend/);
    expect(() => buildConfig({ ...source, RESEND_API_KEY: '', SMTP_HOST: 'smtp.test.example', SMTP_PORT: '0', SMTP_USER: 'user', SMTP_PASSWORD: 'pass' })).toThrow(/SMTP_PORT/);
  });
});

describe('Resend password-reset delivery', () => {
  it('uses HTTPS, bounded requests, an idempotency key, and the configured reset website', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'mail-receipt' }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    await sendPasswordResetEmail('recipient@test.example', 'test-reset-token');
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.headers.Authorization).toBe('Bearer test-resend-key');
    expect(options.headers['Idempotency-Key']).not.toContain('test-reset-token');
    const body = JSON.parse(options.body);
    expect(body.to).toEqual(['recipient@test.example']);
    expect(body.text).toContain('https://app.test.example/reset-password?token=test-reset-token');
    expect(body.text).not.toContain('test-resend-key');
  });

  it('rejects unsuccessful and malformed delivery receipts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('private provider error', { status: 403 })).mockResolvedValueOnce(new Response('{}', { status: 200 })));
    await expect(sendPasswordResetEmail('recipient@test.example', 'token')).rejects.toThrow('(403)');
    await expect(sendPasswordResetEmail('recipient@test.example', 'token')).rejects.toThrow('no delivery receipt');
  });

  it('completes the actual forgot/reset/sign-in journey and revokes both mobile and website sessions', async () => {
    let delivered = '';
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => { delivered = JSON.parse(options.body).text; return new Response('{"id":"accepted"}'); }));
    const user = await registerUser('reset-flow@test.example');
    const second = await api().post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD });
    const request = await api().post('/api/v1/auth/forgot-password').send({ email: user.email });
    expect(request.status).toBe(202);
    const link = delivered.match(/https:\/\/\S+/)![0];
    const token = new URL(link).searchParams.get('token')!;
    expect((await PasswordReset.findOne().lean())!.tokenHash).not.toBe(token);
    // Validation must reject truncation before consuming a still-valid token.
    expect((await api().post('/api/v1/auth/reset-password').send({ token, newPassword: 'A1' + 'a'.repeat(71) })).status).toBe(422);
    expect((await api().post('/api/v1/auth/reset-password').send({ token, newPassword: 'Fresh-password99' })).status).toBe(200);
    expect((await api().get('/api/v1/auth/me').set(user.auth)).status).toBe(401);
    expect((await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${second.body.data.tokens.accessToken}`)).status).toBe(401);
    expect((await api().post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD })).status).toBe(401);
    expect((await api().post('/api/v1/auth/login').send({ email: user.email, password: 'Fresh-password99' })).status).toBe(200);
    expect((await api().post('/api/v1/auth/reset-password').send({ token, newPassword: 'Another-password99' })).status).toBe(400);
  });

  it('does not expose account existence on provider failure and removes the undelivered token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    const user = await registerUser('mail-failure@test.example');
    const known = await api().post('/api/v1/auth/forgot-password').send({ email: user.email });
    const unknown = await api().post('/api/v1/auth/forgot-password').send({ email: 'unknown@test.example' });
    expect(known.status).toBe(202);
    expect(known.body).toEqual(unknown.body);
    expect(await PasswordReset.countDocuments()).toBe(0);
  });

  it('limits repeated deliveries per address, including concurrent requests', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"id":"accepted"}'));
    vi.stubGlobal('fetch', fetcher);
    const user = await registerUser('mail-limit@test.example');
    const replies = await Promise.all(Array.from({ length: 4 }, () => api().post('/api/v1/auth/forgot-password').send({ email: user.email })));
    expect(replies.map((r) => r.status)).toEqual([202, 202, 202, 202]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await PasswordReset.countDocuments()).toBe(1);
  });

  it('does not reset disabled or deleted accounts', async () => {
    let delivered = '';
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => { delivered = JSON.parse(options.body).text; return new Response('{"id":"accepted"}'); }));
    const user = await registerUser('disabled-reset@test.example');
    await api().post('/api/v1/auth/forgot-password').send({ email: user.email });
    const token = new URL(delivered.match(/https:\/\/\S+/)![0]).searchParams.get('token');
    await User.updateOne({ _id: user.id }, { $set: { status: 'disabled' } });
    expect((await api().post('/api/v1/auth/reset-password').send({ token, newPassword: 'Fresh-password99' })).status).toBe(400);
  });
});
