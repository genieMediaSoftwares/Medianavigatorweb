import { expect, it } from 'vitest';
import { z } from 'zod';
import { auth, files, intelligence, media, planner } from '../src/validators/index.js';

it('retains strict auth inputs, email normalization and password byte limits', () => {
  expect(auth.login.parse({ email: ' Person@Example.COM ', password: 'LegacyPassword' }).email).toBe('person@example.com');
  expect(auth.register.safeParse({ email: 'a@example.com', password: 'ValidPassword9', fullName: 'User', role: 'admin' }).success).toBe(false);
  expect(auth.register.safeParse({ email: 'a@example.com', password: 'A1' + 'é'.repeat(36), fullName: 'User' }).success).toBe(false);
});

it('preserves numeric query coercion, defaults and transforms', () => {
  expect(media.list.parse({ limit: '12' }).limit).toBe(12);
  expect(intelligence.summary.parse({}).days).toBe(30);
  expect(planner.bestTimes.parse({ platform: 'all' }).days).toBe(90);
  expect(files.upload.parse({}).purpose).toBe('document');
  expect(media.list.safeParse({ limit: 'not-a-number' }).success).toBe(false);
});

it('rejects an oversized invalid array before allocating per-element validation errors', () => {
  const result = z.array(z.string()).max(4).safeParse(Array(100_000).fill(42));
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toHaveLength(1);
    expect(result.error.issues[0].code).toBe('too_big');
  }
});
