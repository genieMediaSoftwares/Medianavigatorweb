import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';

const store = vi.hoisted(() => new Map<string, { body: Buffer; type: string }>());
vi.mock('../src/lib/storage.js', async () => {
  const crypto = await import('node:crypto');
  return {
    storageEnabled: () => true,
    buildKey: (u: string, p: string, ext: string) => `users/${u}/${p}/${crypto.randomUUID()}${ext}`,
    putObject: async (k: string, body: Buffer, type: string) => { store.set(k, { body, type }); },
    deleteObject: async (k: string) => { store.delete(k); },
    presignedDownloadUrl: async (k: string) => `https://r2.test.example/${k}?sig=abc`,
  };
});

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => { await clearDb(); store.clear(); });

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const upload = (u: any, buf: Buffer, name: string, type: string, extra: Record<string, string> = {}) => {
  let r = api().post('/api/v1/files').set(u.auth).attach('file', buf, { filename: name, contentType: type });
  for (const [k, v] of Object.entries(extra)) r = r.field(k, v);
  return r;
};

describe('files (R2)', () => {
  it('requires authentication', async () => {
    expect((await api().post('/api/v1/files').attach('file', PNG, 'a.png')).status).toBe(401);
  });

  it('stores bytes in object storage and only metadata in MongoDB, under a server-generated key', async () => {
    const u = await registerUser('f1@test.example');
    const res = await upload(u, PNG, '../../etc/passwd.png', 'image/png', { purpose: 'avatar' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ mimeType: 'image/png', size: PNG.length, purpose: 'avatar' });
    expect(JSON.stringify(res.body)).not.toMatch(/users\/|key/);
    const [key] = [...store.keys()];
    expect(key).toMatch(new RegExp(`^users/${u.id}/avatar/[0-9a-f-]{36}\\.png$`));
    expect(key).not.toContain('..');
    const { FileModel } = await import('../src/models/File.js');
    const meta = await FileModel.findOne().lean();
    expect(meta).toMatchObject({ key, mimeType: 'image/png', status: 'ready' });
    expect(meta!.checksum).toHaveLength(64);
  });

  it('rejects disallowed types, mismatched extensions, spoofed contents and oversized files', async () => {
    const u = await registerUser('f2@test.example');
    expect((await upload(u, Buffer.from('MZ binary'), 'x.exe', 'application/x-msdownload')).status).toBe(400);
    expect((await upload(u, PNG, 'x.jpg', 'image/png')).status).toBe(400); // extension mismatch
    expect((await upload(u, Buffer.from('<script>alert(1)</script>'), 'x.png', 'image/png')).status).toBe(400); // not really a PNG
    const big = Buffer.concat([PNG, Buffer.alloc(1_100_000)]);
    expect((await upload(u, big, 'big.png', 'image/png')).status).toBe(413);
    expect(store.size).toBe(0);
  });

  it('lets only the owner list, access or delete a file', async () => {
    const a = await registerUser('fa@test.example');
    const b = await registerUser('fb@test.example');
    const id = (await upload(a, PNG, 'a.png', 'image/png')).body.data.id;

    expect((await api().get('/api/v1/files').set(b.auth)).body.data).toHaveLength(0);
    expect((await api().get(`/api/v1/files/${id}`).set(b.auth)).status).toBe(404);
    expect((await api().delete(`/api/v1/files/${id}`).set(b.auth)).status).toBe(404);
    expect(store.size).toBe(1);

    const access = await api().get(`/api/v1/files/${id}`).set(a.auth);
    expect(access.status).toBe(200);
    expect(access.body.data.url).toMatch(/^https:\/\/r2\.test\.example\//);
    expect(access.body.data.expiresInSeconds).toBe(300);

    expect((await api().delete(`/api/v1/files/${id}`).set(a.auth)).status).toBe(200);
    expect(store.size).toBe(0);
    expect((await api().get(`/api/v1/files/${id}`).set(a.auth)).status).toBe(404);
  });

  it('ignores a client-supplied owner', async () => {
    const a = await registerUser('fo-a@test.example');
    const b = await registerUser('fo-b@test.example');
    const res = await upload(a, PNG, 'a.png', 'image/png', { userId: b.id });
    expect(res.status).toBe(422);
    expect((await api().get('/api/v1/files').set(b.auth)).body.data).toHaveLength(0);
  });
});
