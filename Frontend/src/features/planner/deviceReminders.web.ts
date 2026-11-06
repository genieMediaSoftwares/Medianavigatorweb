import type { Plan } from '@/types/api';

// Browser reminders use the server's in-app notification list. Do not import
// expo-notifications here: its native token listener runs during module loading.
export const deviceRemindersSupported = false;
export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';
export async function reminderPermission(): Promise<ReminderPermission> { return 'unsupported'; }
export async function requestReminderPermission(): Promise<ReminderPermission> { return 'unsupported'; }
export async function syncDeviceReminders(_plans: Plan[], _scope?: Set<string>): Promise<void> {}
export async function cancelDeviceReminders(_planId: string): Promise<void> {}
export function listenForReminderTaps(_open: (planId: string) => void): () => void { return () => undefined; }
export async function refreshDeviceReminders(): Promise<void> {}
