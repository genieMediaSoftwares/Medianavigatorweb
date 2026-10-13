import { apiRequest } from '@/lib/api/client';
import type { LoginResult, Me, RegisterResult } from '@/types/api';

export function registerRequest(input: { email: string; password: string; fullName: string; organization?: string }): Promise<RegisterResult> {
  return apiRequest<RegisterResult>('/auth/register', { method: 'POST', json: input });
}

export function loginRequest(input: { email: string; password: string }): Promise<LoginResult> {
  return apiRequest<LoginResult>('/auth/login', { method: 'POST', json: input });
}

/** Revokes this device's session on the server. */
export function logoutRequest(): Promise<{ loggedOut: true }> {
  return apiRequest('/auth/logout', { method: 'POST', auth: true });
}

export function fetchMe(): Promise<Me> {
  return apiRequest<Me>('/auth/me', { auth: true });
}

/** 202 for known and unknown emails alike; 503 when email delivery is not configured on the server. */
export function forgotPasswordRequest(input: { email: string }): Promise<{ message: string }> {
  return apiRequest('/auth/forgot-password', { method: 'POST', json: input });
}

export function resetPasswordRequest(input: { token: string; newPassword: string }): Promise<{ reset: true }> {
  return apiRequest('/auth/reset-password', { method: 'POST', json: input });
}
