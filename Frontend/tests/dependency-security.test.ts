import { expect, it } from 'vitest';
import decode from 'decode-uri-component';
import query from 'query-string';

it('preserves the callable CommonJS decoder and legacy plus handling', () => {
  expect(typeof decode).toBe('function');
  expect(decode('hello+world%2B')).toBe('hello world+');
  expect(decode('%F0%9F%98%80')).toBe('😀');
});

it('keeps reset/OAuth query strings and URL fragments compatible with query-string 7', () => {
  expect({ ...query.parse('token=abc_123-test&message=hi+there&account=a%2Bb') }).toEqual({ token: 'abc_123-test', message: 'hi there', account: 'a+b' });
  const url = query.parseUrl('medianavigator://reset-password?token=abc%2B123#done', { parseFragmentIdentifier: true });
  expect(url.query.token).toBe('abc+123');
  expect(url.fragmentIdentifier).toBe('done');
});

it('handles large malformed percent runs without recursive decoding or a hang', () => {
  const input = '%FE'.repeat(50_000);
  const started = performance.now();
  expect(decode(input)).toBe(input);
  expect(performance.now() - started).toBeLessThan(2000);
  expect(query.parse('bad=%FE%FF&valid=ok').valid).toBe('ok');
  expect(() => decode(null as unknown as string)).toThrow(TypeError);
});
