import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase, disconnectDatabase, ensureIndexes } from '../src/db/client.js';
import { createApp } from '../src/app.js';
import { userRepository } from '../src/repositories/user.repository.js';

let mongod: MongoMemoryServer | undefined;

export async function startTestDb() {
  // Set TEST_MONGODB_URI to use an existing MongoDB server (for example when downloading mongod is blocked).
  // Otherwise an in-memory mongod is started; MONGOMS_SYSTEM_BINARY can point it at a local binary.
  if (process.env.TEST_MONGODB_URI) await connectDatabase(process.env.TEST_MONGODB_URI);
  else { mongod = await MongoMemoryServer.create(); await connectDatabase(mongod.getUri('mediatest')); }
  await ensureIndexes();
}

export async function stopTestDb() {
  await disconnectDatabase();
  await mongod?.stop();
}

export async function clearDb() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export const app = () => createApp();
export const api = () => request(createApp());

export const PASSWORD = 'Sup3rSecret99';

export async function registerUser(email: string, opts: { password?: string; fullName?: string } = {}) {
  const res = await request(createApp()).post('/api/v1/auth/register').send({ email, password: opts.password ?? PASSWORD, fullName: opts.fullName ?? 'Test User' });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const d = res.body.data;
  return { id: d.user.id as string, email, accessToken: d.tokens.accessToken as string, refreshToken: d.tokens.refreshToken as string, auth: { Authorization: `Bearer ${d.tokens.accessToken}` } };
}

/** Step-up for a test session, as the admin app does before a high-risk change. */
export async function reauth(u: { auth: Record<string, string> }, password = PASSWORD) {
  const res = await request(createApp()).post('/api/v1/auth/reauth').set(u.auth).send({ password });
  if (res.status !== 200) throw new Error(`reauth failed: ${res.status} ${JSON.stringify(res.body)}`);
}

export async function registerAdmin(email = 'admin@test.example') {
  const u = await registerUser(email);
  await userRepository.setRole(u.id, 'admin');
  await reauth(u);
  // role is read from the database on each request, so the existing token is already admin
  return u;
}
