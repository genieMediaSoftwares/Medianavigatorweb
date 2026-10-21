import { getApiBaseUrl } from '@/config/env';
import { deleteSecureItem, getSecureItem, SecureStorageKey, setSecureItem } from '@/lib/storage/secure-storage';
import type { ApiErrorDetail, PageMeta, TokenPair } from '@/types/api';

/** Field name → message, built from the server's 422 `details`. */
export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when no response was received. */
    readonly status: number,
    /** Machine-readable code from the server (e.g. VALIDATION_ERROR) or a client-side code. */
    readonly code: string,
    readonly details: ApiErrorDetail[] = [],
    /** Why connecting an account failed (token_invalid, permission_missing, app_restricted…), when the server says. */
    readonly reason: string | null = null,
    /** Where connecting stopped: token, permissions or account. */
    readonly stage: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Per-field messages from a 422 response, keyed by the body field name. */
  get fields(): FieldErrors | undefined {
    const entries = this.details.filter((d) => d.path).map((d) => [d.path as string, d.message] as const);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
}

type Envelope<T> =
  | { success: true; data: T; meta?: PageMeta }
  | { success: false; error: { code: string; message: string; details?: ApiErrorDetail[] | { reason?: string; stage?: string } } };

type Query = Record<string, string | number | boolean | null | undefined>;

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Query;
  /** Serialized as the JSON request body. */
  json?: unknown;
  /** Attach the stored access token, refreshing it once on 401. A failed refresh signs the user out. */
  auth?: boolean;
}

// Every resource lives under this prefix on the API origin from EXPO_PUBLIC_API_BASE_URL.
const API_PREFIX = '/api/v1';

let unauthorizedHandler: (() => void) | null = null;

/** Registered by the auth provider so an invalid session anywhere signs the user out. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export async function storeTokens(tokens: TokenPair): Promise<void> {
  await setSecureItem(SecureStorageKey.AccessToken, tokens.accessToken);
  await setSecureItem(SecureStorageKey.RefreshToken, tokens.refreshToken);
}

export async function clearTokens(): Promise<void> {
  await deleteSecureItem(SecureStorageKey.AccessToken);
  await deleteSecureItem(SecureStorageKey.RefreshToken);
}

export async function hasStoredSession(): Promise<boolean> {
  return (await getSecureItem(SecureStorageKey.RefreshToken)) !== null;
}

async function handleUnauthorized(): Promise<void> {
  await clearTokens();
  unauthorizedHandler?.();
}

function buildUrl(path: string, query?: Query): string {
  let base: string;
  try {
    base = getApiBaseUrl();
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'API URL is not configured.', 0, 'CONFIG_ERROR');
  }
  const qs = Object.entries(query ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${base}${API_PREFIX}${path}${qs ? `?${qs}` : ''}`;
}

async function send<T>(url: string, init: RequestInit): Promise<{ response: Response; envelope: Envelope<T> }> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }
  try {
    return { response, envelope: (await response.json()) as Envelope<T> };
  } catch {
    throw new ApiError(`Unexpected response from the server (status ${response.status}).`, response.status, 'INVALID_RESPONSE');
  }
}

function toError(response: Response, envelope: Envelope<unknown>): ApiError {
  const error = envelope.success ? null : envelope.error;
  const message =
    response.status === 429 ? 'Too many requests. Please wait a moment and try again.' : (error?.message ?? `Request failed with status ${response.status}.`);
  // `details` is a list of field problems (422) or, for a refused account connection, { reason, stage }.
  const details = error?.details;
  const list = Array.isArray(details) ? details : [];
  const info = Array.isArray(details) ? (details[0] as { reason?: string; stage?: string } | undefined) : details;
  return new ApiError(message, response.status, error?.code ?? 'UNKNOWN_ERROR', list, info?.reason ?? null, info?.stage ?? null);
}

// One refresh at a time: concurrent 401s share the same rotation, because the server revokes the
// whole session when an already-rotated refresh token is presented again.
let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = await getSecureItem(SecureStorageKey.RefreshToken);
  if (!refreshToken) return false;
  const { response, envelope } = await send<{ tokens: TokenPair }>(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok || !envelope.success) {
    if (response.status === 401 || response.status === 422) return false;
    throw toError(response, envelope);
  }
  await storeTokens(envelope.data.tokens);
  return true;
}

function refreshOnce(): Promise<boolean> {
  refreshing ??= refreshTokens().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function request<T>(path: string, options: ApiRequestOptions): Promise<{ data: T; meta?: PageMeta }> {
  const { method = 'GET', query, json, auth = false } = options;
  const url = buildUrl(path, query);

  const attempt = async () => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (json !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = await getSecureItem(SecureStorageKey.AccessToken);
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return send<T>(url, { method, headers, body: json === undefined ? undefined : JSON.stringify(json) });
  };

  let { response, envelope } = await attempt();
  if (auth && response.status === 401) {
    if (!(await refreshOnce())) {
      await handleUnauthorized();
      throw new ApiError('Your session has ended. Please sign in again.', 401, 'UNAUTHORIZED');
    }
    ({ response, envelope } = await attempt());
    if (response.status === 401) await handleUnauthorized();
  }

  if (!response.ok || !envelope.success) throw toError(response, envelope);
  return { data: envelope.data, meta: envelope.meta };
}

/**
 * Fetch wrapper for the Media Navigator API. Failures are always thrown to the caller so screens
 * can render a real error state; there is no fallback data.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return (await request<T>(path, options)).data;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Cursor-paginated list (`?limit=&cursor=`, next cursor in `meta.nextCursor`). */
export async function apiPage<T>(path: string, query: Query): Promise<Page<T>> {
  const { data, meta } = await request<T[]>(path, { query, auth: true });
  return { items: data, nextCursor: meta?.nextCursor ?? null };
}
