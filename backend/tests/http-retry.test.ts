import { afterEach, expect, it, vi } from 'vitest';
import { httpFetch } from '../src/lib/http.js';

afterEach(() => vi.unstubAllGlobals());

it('cancels discarded response bodies before retrying and keeps the final body readable', async () => {
  const cancel = vi.fn();
  const rejected = new Response(new ReadableStream({ cancel }), { status: 503 });
  const final = new Response('recovered');
  const fetchMock = vi.fn().mockResolvedValueOnce(rejected).mockImplementationOnce(() => {
    expect(cancel).toHaveBeenCalledOnce();
    return Promise.resolve(final);
  });
  vi.stubGlobal('fetch', fetchMock);
  expect(await (await httpFetch('https://provider.test.example', { maxRetries: 1 })).text()).toBe('recovered');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('does not discard a final error response needed by the provider adapter', async () => {
  const cancel = vi.fn();
  const response = new Response(new ReadableStream({ cancel }), { status: 429 });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
  expect(await httpFetch('https://provider.test.example', { maxRetries: 0 })).toBe(response);
  expect(cancel).not.toHaveBeenCalled();
  await response.body?.cancel();
});
