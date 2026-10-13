import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { startTestDb, stopTestDb, clearDb, api, PASSWORD } from './helpers.js';
import { repairLegacySessionIndex } from '../src/db/repairLegacySessionIndex.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearDb);

describe('legacy session index repair', () => {
  it('reproduces new-email signup failure and restores signup and login without deleting accounts', async () => {
    const db = mongoose.connection.db!;
    const sessions = db.collection('sessions');
    await sessions.createIndex({ tokenHash: 1 }, { name: 'sessions_token_hash_unique', unique: true });
    const signup = (email: string) => api().post('/api/v1/auth/register').send({ email, password: PASSWORD, fullName: 'Test User' });
    expect((await signup('first@test.example')).status).toBe(201);
    const failed = await signup('second@test.example');
    expect(failed.status).toBe(409);
    expect(failed.body.error.details).toBeUndefined();
    expect(await repairLegacySessionIndex(db)).toBe(true);
    expect(await repairLegacySessionIndex(db)).toBe(false);
    expect((await api().post('/api/v1/auth/login').send({ email: 'second@test.example', password: PASSWORD })).status).toBe(200);
    expect((await signup('third@test.example')).status).toBe(201);
    const duplicate = await signup('third@test.example');
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.details[0].path).toBe('email');
    expect(await db.collection('users').countDocuments()).toBe(3);
    expect((await sessions.indexes()).some((index) => index.key.refreshTokenHash === 1 && index.unique)).toBe(true);
  });
});
