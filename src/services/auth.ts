/**
 * Session handling for the web client. Talks to the Media Navigator API only.
 * Provider tokens are never handled here: they are sent once to the API when connecting and are never stored in the browser.
 */
/** The API address comes from the environment (backend/.env, VITE_API_BASE_URL). There is deliberately no default. */
const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
if (!RAW_API_BASE || !/^https?:\/\//.test(RAW_API_BASE)) {
  throw new Error('VITE_API_BASE_URL is not set. Add it to backend/.env (for example VITE_API_BASE_URL=https://api.example.com) and restart.');
}
const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

const ACCESS_KEY = 'mn_access_token';
const REFRESH_KEY = 'mn_refresh_token';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface SessionUser { id: string; email: string; role: 'user' | 'admin'; status: string }
export interface SessionProfile { fullName: string; organization: string | null; accountType: string | null; timezone: string | null; onboardingCompleted: boolean }
interface Tokens { accessToken: string; refreshToken: string }

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

export const hasSession = () => Boolean(read(REFRESH_KEY));
const saveTokens = (t: Tokens) => { write(ACCESS_KEY, t.accessToken); write(REFRESH_KEY, t.refreshToken); };
export const clearSession = () => { write(ACCESS_KEY, null); write(REFRESH_KEY, null); };

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = read(REFRESH_KEY);
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
      if (!res.ok) return false;
      saveTokens((await res.json()).data.tokens);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => { refreshing = null; }, 0);
    }
  })();
  return refreshing;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> { body?: unknown; auth?: boolean }

/** Returns the unwrapped `data` (and `meta` when the caller asks for it via requestWithMeta). */
export async function requestWithMeta<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta?: any }> {
  const { body, auth = true, headers, ...rest } = opts;
  const send = () => fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(auth && read(ACCESS_KEY) ? { Authorization: `Bearer ${read(ACCESS_KEY)}` } : {}), ...(headers as Record<string, string> | undefined) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let res = await send();
  if (res.status === 401 && auth && (await refreshTokens())) res = await send();

  if (!(res.headers.get('content-type') || '').includes('application/json')) {
    const hint = res.status === 404 || res.status === 405
      ? 'This page is not connected to the Media Navigator API. Set VITE_API_BASE_URL to the API address when building the web app, or run the API locally.'
      : `Server returned a non-JSON response (${res.status})`;
    throw new ApiError(hint, res.status);
  }
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    if (res.status === 401 && auth) {
      clearSession();
      window.dispatchEvent(new CustomEvent('mn:auth-lost'));
    }
    throw new ApiError(json.error?.message || `Request failed (${res.status})`, res.status, json.error?.code);
  }
  return { data: json.data as T, meta: json.meta };
}

export const request = async <T>(path: string, opts?: RequestOptions) => (await requestWithMeta<T>(path, opts)).data;

export const authApi = {
  async register(input: { email: string; password: string; fullName: string; organization?: string; accountType?: string }) {
    const data = await request<{ user: SessionUser; profile: SessionProfile; tokens: Tokens }>('/api/v1/auth/register', { method: 'POST', body: input, auth: false });
    saveTokens(data.tokens);
    return data;
  },
  async login(email: string, password: string) {
    const data = await request<{ user: SessionUser; tokens: Tokens }>('/api/v1/auth/login', { method: 'POST', body: { email, password }, auth: false });
    saveTokens(data.tokens);
    return data;
  },
  me: () => request<{ user: SessionUser; profile: SessionProfile | null }>('/api/v1/auth/me'),
  async logout() {
    try { await request('/api/v1/auth/logout', { method: 'POST' }); } catch { /* the server session may already be gone */ }
    clearSession();
  },
  forgotPassword: (email: string) => request('/api/v1/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
};
