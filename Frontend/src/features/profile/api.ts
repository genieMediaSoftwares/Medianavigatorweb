import { apiRequest } from '@/lib/api/client';
import type { Profile, ProfileUpdate, SessionInfo } from '@/types/api';

export async function updateProfile(update: ProfileUpdate): Promise<Profile> {
  const { profile } = await apiRequest<{ profile: Profile }>('/profiles/me', { method: 'PATCH', auth: true, json: update });
  return profile;
}

export async function fetchSessions(): Promise<SessionInfo[]> {
  const { sessions } = await apiRequest<{ sessions: SessionInfo[] }>('/users/me/sessions', { auth: true });
  return sessions;
}

export function revokeSession(id: string): Promise<{ revoked: true }> {
  return apiRequest(`/users/me/sessions/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
}

/** Revokes every session, including this one. */
export function logoutAllSessions(): Promise<{ loggedOut: true }> {
  return apiRequest('/auth/logout-all', { method: 'POST', auth: true });
}

/** Changes the password; the server revokes every other session. */
export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<{ changed: true }> {
  return apiRequest('/auth/change-password', { method: 'POST', auth: true, json: input });
}

/** Permanently deletes the account and everything stored for it. */
export function deleteAccount(password: string): Promise<{ deleted: true }> {
  return apiRequest('/users/me', { method: 'DELETE', auth: true, json: { password } });
}
