import { z } from 'zod';
import { errorBodySchema, pageMetaSchema } from './schemas';
import type { Page } from '@/types/api';

/**
 * Browser-side API client. It only ever calls this app's own /api/v1 route handlers (same origin); those call the API
 * from the server. No token is visible here.
 */
export const BFF_PREFIX = '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId: string | null,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get unreachable() {
    return this.code === 'API_UNREACHABLE' || this.code === 'NETWORK_ERROR';
  }
}

/** Called once when a request comes back 401 after the server already tried to refresh: the session is over. */
let onSignedOut: (() => void) | null = null;
let leaving = false;
export function setSignedOutHandler(fn: (() => void) | null) {
  onSignedOut = fn;
}
/**
 * The app is deliberately leaving the current session (sign in, sign out, account deleted). Requests still in flight
 * may come back 401 because the cookies are already gone; that is expected and must not start a second navigation.
 */
export function markLeavingSession() {
  leaving = true;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Query;
  /** JSON body, or FormData for uploads. */
  body?: unknown;
  /** false for the public auth endpoints, where 401 means "wrong password", not "signed out". */
  signOutOn401?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const s = qs.toString();
  return `${BFF_PREFIX}${path}${s ? `?${s}` : ''}`;
}

async function send(path: string, opts: RequestOptions): Promise<{ json: unknown; requestId: string | null }> {
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers: opts.body === undefined || isForm ? { accept: 'application/json' } : { accept: 'application/json', 'content-type': 'application/json' },
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      credentials: 'same-origin',
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', "We couldn't reach Media Navigator. Check your connection, and that the API address is configured.", null);
  }
  const requestId = res.headers.get('x-request-id');
  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = errorBodySchema.safeParse(json);
    const code = parsed.success ? parsed.data.error.code : `HTTP_${res.status}`;
    const message = res.status === 429
      ? 'Too many requests. Please try again in a moment.'
      : parsed.success ? parsed.data.error.message : 'Something went wrong. Please try again.';
    const error = new ApiError(res.status, code, message, requestId, parsed.success ? parsed.data.error.details : undefined);
    if (res.status === 401 && opts.signOutOn401 !== false && !leaving) onSignedOut?.();
    throw error;
  }
  return { json, requestId };
}

function parseData<T>(schema: z.ZodType<T>, json: unknown, path: string, requestId: string | null): T {
  const data = (json as { data?: unknown } | null)?.data;
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(500, 'UNEXPECTED_RESPONSE', `The server sent a response this app doesn't understand (${path}).`, requestId, z.treeifyError(parsed.error));
  }
  return parsed.data;
}

/** One request, response `data` parsed with `schema`. */
export async function api<T>(path: string, schema: z.ZodType<T>, opts: RequestOptions = {}): Promise<T> {
  const { json, requestId } = await send(path, opts);
  return parseData(schema, json, path, requestId);
}

/** A cursor-paginated list: `data` is the page, `meta.nextCursor` the next cursor. */
export async function apiPage<T>(path: string, itemSchema: z.ZodType<T>, opts: RequestOptions = {}): Promise<Page<T>> {
  const { json, requestId } = await send(path, opts);
  const items = parseData(z.array(itemSchema), json, path, requestId);
  const meta = pageMetaSchema.safeParse((json as { meta?: unknown } | null)?.meta);
  return { items, nextCursor: meta.success ? meta.data.nextCursor ?? null : null, total: meta.success ? meta.data.total : undefined };
}

/** A request whose response body the caller does not use. */
export async function apiVoid(path: string, opts: RequestOptions = {}): Promise<void> {
  await send(path, opts);
}
