import { z } from 'zod';
import type { ApiErrorDetail, PageMeta } from '@/types/api';

/** Error thrown for every failed API call. `message` is safe to show to people. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: ApiErrorDetail[] = [],
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Message for the field named `path` in a 422 response, if any. */
  fieldMessage(path: string): string | undefined {
    return this.details.find((d) => d.path === path)?.message;
  }
}

const envelope = z.looseObject({
  success: z.boolean(),
  data: z.unknown().optional(),
  meta: z.looseObject({ limit: z.number().optional(), nextCursor: z.string().nullable().optional(), total: z.number().optional() }).optional(),
  error: z.looseObject({ code: z.string(), message: z.string(), details: z.array(z.looseObject({ message: z.string() })).optional() }).optional(),
});

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
}

export const SIGNED_OUT_EVENT = 'mn:signed-out';

function friendly(status: number, code: string, message: string): string {
  if (status === 429 || code === 'RATE_LIMITED') return 'Too many requests. Please try again in a moment.';
  return message;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PageMeta }> {
  const { method = 'GET', query, body, signal } = options;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const url = `/api/v1${path}${qs.size ? `?${qs}` : ''}`;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body === undefined || isForm ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError("We couldn't reach Media Navigator. Check your connection, and that the API address is configured.", 0, 'NETWORK');
  }

  const requestId = res.headers.get('x-request-id') ?? undefined;
  let parsed: z.infer<typeof envelope>;
  try {
    parsed = envelope.parse(await res.json());
  } catch {
    throw new ApiError('Media Navigator sent a reply we could not read. Please try again.', res.status, 'BAD_RESPONSE', [], requestId);
  }

  if (!res.ok || !parsed.success) {
    const e = parsed.error;
    if (res.status === 401 && typeof window !== 'undefined' && e?.code !== 'UNAUTHORIZED_LOGIN') window.dispatchEvent(new CustomEvent(SIGNED_OUT_EVENT));
    throw new ApiError(friendly(res.status, e?.code ?? 'ERROR', e?.message ?? 'Something went wrong.'), res.status, e?.code ?? 'ERROR', (e?.details as ApiErrorDetail[] | undefined) ?? [], requestId);
  }
  return { data: parsed.data as T, meta: parsed.meta as PageMeta | undefined };
}

export const apiGet = async <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) => (await apiRequest<T>(path, { query, signal })).data;
export const apiSend = async <T>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown) => (await apiRequest<T>(path, { method, body: body ?? (method === 'DELETE' ? undefined : {}) })).data;
