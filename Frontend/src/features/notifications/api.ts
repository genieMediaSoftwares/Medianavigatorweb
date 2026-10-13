import { apiPage, apiRequest, Page } from '@/lib/api/client';
import type { NotificationItem } from '@/types/api';

export function fetchNotifications(cursor?: string | null): Promise<Page<NotificationItem>> {
  return apiPage<NotificationItem>('/notifications', { limit: 25, cursor: cursor ?? undefined });
}

export async function fetchUnreadCount(): Promise<number> {
  const { unread } = await apiRequest<{ unread: number }>('/notifications/unread-count', { auth: true });
  return unread;
}

export function markNotificationRead(id: string): Promise<unknown> {
  return apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', auth: true });
}

export function markAllNotificationsRead(): Promise<unknown> {
  return apiRequest('/notifications/read-all', { method: 'POST', auth: true });
}
