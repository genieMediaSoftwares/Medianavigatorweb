import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api, clearDb, PASSWORD, reauth, registerAdmin, registerUser, startTestDb, stopTestDb } from './helpers.js';
import { config } from '../src/config/env.js';
import { totpAt, timeStep, verifyTotp, base32Encode } from '../src/lib/totp.js';
import { userRepository } from '../src/repositories/user.repository.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { AuditLog } from '../src/models/AuditLog.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearDb);

describe('TOTP (RFC 6238)', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  it('matches the RFC test vectors (6-digit truncation)', () => {
    expect(totpAt(secret, Math.floor(59 / 30))).toBe('287082');
    expect(totpAt(secret, Math.floor(1111111109 / 30))).toBe('081804');
    expect(totpAt(secret, Math.floor(2000000000 / 30))).toBe('279037');
  });
  it('accepts one step of drift, refuses older steps and replays', () => {
    const now = 1111111109 * 1000;
    const step = timeStep(now);
    expect(verifyTotp(secret, totpAt(secret, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(secret, totpAt(secret, step - 2), null, now)).toBeNull();
    expect(verifyTotp(secret, totpAt(secret, step), step, now)).toBeNull();
    expect(verifyTotp(secret, 'abcdef', null, now)).toBeNull();
  });
});

/** Enrols a staff member through the API and returns the secret and recovery codes. */
async function enrol(u: { auth: Record<string, string> }) {
  const setup = await api().post('/api/v1/auth/mfa/setup').set(u.auth).send({ password: PASSWORD });
  expect(setup.status).toBe(200);
  const secret = setup.body.data.secret as string;
  const enable = await api().post('/api/v1/auth/mfa/enable').set(u.auth).send({ mfaCode: totpAt(secret, timeStep()) });
  expect(enable.status).toBe(200);
  return { secret, recoveryCodes: enable.body.data.recoveryCodes as string[] };
}

describe('staff two-step sign-in', () => {
  it('is limited to staff, needs the password to start, and needs a matching code to turn on', async () => {
    const customer = await registerUser('customer@mfa.example');
    expect((await api().post('/api/v1/auth/mfa/setup').set(customer.auth).send({ password: PASSWORD })).status).toBe(403);
    const admin = await registerAdmin('admin@mfa.example');
    expect((await api().post('/api/v1/auth/mfa/setup').set(admin.auth).send({ password: 'Wrong-pass-1' })).body.error.code).toBe('INVALID_CREDENTIALS');
    const setup = await api().post('/api/v1/auth/mfa/setup').set(admin.auth).send({ password: PASSWORD });
    expect(setup.body.data.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    const wrong = await api().post('/api/v1/auth/mfa/enable').set(admin.auth).send({ mfaCode: '000000' });
    expect(wrong.status).toBe(400);
    const stored = await User.findById(admin.id).select('+mfa.pendingSecretEnc +mfa.secretEnc').lean();
    expect(stored?.mfa?.enabled).toBe(false);
    expect(stored?.mfa?.pendingSecretEnc).not.toContain(setup.body.data.secret);
  });

  it('turning it on returns recovery codes once, signs out other devices, and is reported without secrets', async () => {
    const admin = await registerAdmin('on@mfa.example');
    const other = await api().post('/api/v1/auth/login').send({ email: 'on@mfa.example', password: PASSWORD });
    const otherAuth = { Authorization: `Bearer ${other.body.data.tokens.accessToken}` };
    const { recoveryCodes } = await enrol(admin);
    expect(recoveryCodes).toHaveLength(10);
    expect((await api().get('/api/v1/auth/me').set(otherAuth)).status).toBe(401);
    const me = await api().get('/api/v1/auth/me').set(admin.auth);
    expect(me.body.data.user.mfaEnabled).toBe(true);
    expect(JSON.stringify(me.body)).not.toMatch(/secretEnc|recoveryCodeHashes/);
    expect((await api().get('/api/v1/auth/mfa').set(admin.auth)).body.data).toMatchObject({ enabled: true, recoveryCodesRemaining: 10, available: true });
    expect(await AuditLog.exists({ action: 'mfa.enable', targetId: admin.id })).toBeTruthy();
  });

  it('sign-in requires the code, counts wrong codes toward lockout, refuses replays and accepts each recovery code once', async () => {
    const admin = await registerAdmin('login@mfa.example');
    const { secret, recoveryCodes } = await enrol(admin);
    const login = (body: Record<string, string>) => api().post('/api/v1/auth/login').send({ email: 'login@mfa.example', password: PASSWORD, ...body });

    const missing = await login({});
    expect(missing.status).toBe(403);
    expect(missing.body.error.code).toBe('MFA_REQUIRED');
    expect(missing.body.data).toBeUndefined();

    const before = (await User.findById(admin.id).lean())!.failedLoginCount;
    expect((await login({ mfaCode: '000000' })).status).toBe(401);
    expect((await User.findById(admin.id).lean())!.failedLoginCount).toBe(before + 1);

    const code = totpAt(secret, timeStep() + 1); // the enrolment code used the current step
    expect((await login({ mfaCode: code })).status).toBe(200);
    expect((await login({ mfaCode: code })).status).toBe(401); // replay

    expect((await login({ recoveryCode: recoveryCodes[0] })).status).toBe(200);
    expect((await login({ recoveryCode: recoveryCodes[0] })).status).toBe(401);
    expect((await api().get('/api/v1/auth/mfa').set(admin.auth)).body.data.recoveryCodesRemaining).toBe(9);
  });

  it('turning it off needs the password and a code, and removes the secret and recovery codes', async () => {
    const admin = await registerAdmin('off@mfa.example');
    const { secret } = await enrol(admin);
    expect((await api().post('/api/v1/auth/mfa/disable').set(admin.auth).send({ password: PASSWORD, mfaCode: '000000' })).status).toBe(400);
    expect((await api().post('/api/v1/auth/mfa/disable').set(admin.auth).send({ password: PASSWORD, mfaCode: totpAt(secret, timeStep() + 1) })).status).toBe(200);
    const stored = await User.findById(admin.id).select('+mfa.secretEnc +mfa.recoveryCodeHashes').lean();
    expect(stored?.mfa).toMatchObject({ enabled: false, secretEnc: null });
    expect(stored?.mfa?.recoveryCodeHashes ?? []).toEqual([]);
    expect((await api().post('/api/v1/auth/login').send({ email: 'off@mfa.example', password: PASSWORD })).status).toBe(200);
  });

  it('a customer without MFA signs in exactly as before', async () => {
    await registerUser('plain@mfa.example');
    expect((await api().post('/api/v1/auth/login').send({ email: 'plain@mfa.example', password: PASSWORD })).status).toBe(200);
  });
});

describe('step-up for high-risk admin actions', () => {
  it('requires a recent re-confirmation, which expires, and asks for the code when MFA is on', async () => {
    const admin = await registerAdmin('stepup@mfa.example');
    const target = await registerUser('target@mfa.example');
    await Session.updateMany({}, { $set: { reauthAt: null } });
    const change = () => api().patch(`/api/v1/admin/users/${target.id}/status`).set(admin.auth).send({ status: 'disabled' });
    const blocked = await change();
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('REAUTH_REQUIRED');
    expect((await api().get('/api/v1/auth/me').set(admin.auth)).status).toBe(200); // the session survives

    expect((await api().post('/api/v1/auth/reauth').set(admin.auth).send({ password: 'Wrong-pass-1' })).status).toBe(400);
    await reauth(admin);
    expect((await change()).status).toBe(200);

    await Session.updateMany({}, { $set: { reauthAt: new Date(Date.now() - (config.auth.stepUpMaxAgeSeconds + 60) * 1000) } });
    expect((await api().patch(`/api/v1/admin/users/${target.id}/status`).set(admin.auth).send({ status: 'active' })).body.error.code).toBe('REAUTH_REQUIRED');

    const { secret } = await enrol(admin);
    expect((await api().post('/api/v1/auth/reauth').set(admin.auth).send({ password: PASSWORD })).body.error.code).toBe('MFA_REQUIRED');
    expect((await api().post('/api/v1/auth/reauth').set(admin.auth).send({ password: PASSWORD, mfaCode: totpAt(secret, timeStep() + 1) })).status).toBe(200);
    expect((await api().patch(`/api/v1/admin/users/${target.id}/status`).set(admin.auth).send({ status: 'active' })).status).toBe(200);
  });

  it('read-only admin pages need no step-up', async () => {
    const admin = await registerAdmin('reader@mfa.example');
    await Session.updateMany({}, { $set: { reauthAt: null } });
    expect((await api().get('/api/v1/admin/users').set(admin.auth)).status).toBe(200);
  });
});

describe('enforcement and recovery', () => {
  afterEach(() => { (config.auth as { staffMfaRequired: boolean }).staffMfaRequired = false; });

  it('when enforced, blocks un-enrolled staff from admin endpoints but lets them enrol', async () => {
    const staff = await registerUser('ops@mfa.example');
    await userRepository.setRole(staff.id, 'ops_admin');
    (config.auth as { staffMfaRequired: boolean }).staffMfaRequired = true;
    const blocked = await api().get('/api/v1/admin/system').set(staff.auth);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('MFA_ENROLLMENT_REQUIRED');
    const { secret } = await enrol(staff);
    expect((await api().get('/api/v1/admin/system').set(staff.auth)).status).toBe(200);
    expect((await api().post('/api/v1/auth/mfa/disable').set(staff.auth).send({ password: PASSWORD, mfaCode: totpAt(secret, timeStep() + 1) })).status).toBe(403);
    const customer = await registerUser('customer2@mfa.example');
    expect((await api().get('/api/v1/auth/me').set(customer.auth)).status).toBe(200);
  });

  it('a super administrator can reset a lost enrolment, which signs that person out and is audited', async () => {
    const admin = await registerAdmin('super@mfa.example');
    const staff = await registerUser('lost@mfa.example');
    await userRepository.setRole(staff.id, 'support');
    await enrol(staff);
    expect((await api().post(`/api/v1/admin/users/${admin.id}/mfa/reset`).set(admin.auth)).status).toBe(400);
    expect((await api().post(`/api/v1/admin/users/${staff.id}/mfa/reset`).set(staff.auth)).status).toBe(403);
    const res = await api().post(`/api/v1/admin/users/${staff.id}/mfa/reset`).set(admin.auth);
    expect(res.status).toBe(200);
    expect((await User.findById(staff.id).lean())!.mfa?.enabled).toBe(false);
    expect((await api().get('/api/v1/auth/me').set(staff.auth)).status).toBe(401);
    expect(await AuditLog.exists({ action: 'mfa.reset_by_admin', targetId: staff.id })).toBeTruthy();
  });
});
