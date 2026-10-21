import * as Notifications from 'expo-notifications';
import { Platform as RNPlatform } from 'react-native';

import type { Plan } from '@/types/api';

import { fetchPlansInRange } from './api';
import { desiredDeviceReminders, reconcile } from './reminderSchedule';

/**
 * Device notifications for plan reminders, scheduled locally with expo-notifications so they arrive even when the
 * app is closed. The server also writes each reminder to the in-app Notifications list. Web has no local
 * scheduling, so there only the in-app list is used.
 */

export const deviceRemindersSupported = RNPlatform.OS === 'ios' || RNPlatform.OS === 'android';

const CHANNEL = 'plan-reminders';
let configured = false;

function configure() {
  if (configured || !deviceRemindersSupported) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (RNPlatform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Plan reminders', importance: Notifications.AndroidImportance.DEFAULT });
  }
}

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function reminderPermission(): Promise<ReminderPermission> {
  if (!deviceRemindersSupported) return 'unsupported';
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

/** Asks only when the user turns a reminder on. Returns the resulting state. */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!deviceRemindersSupported) return 'unsupported';
  configure();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  const p = await Notifications.requestPermissionsAsync();
  return p.granted ? 'granted' : 'denied';
}

/**
 * Makes the device's scheduled plan reminders match `plans`. Pass `scope` when `plans` is not the full list, so
 * reminders of plans that weren't loaded are left untouched. Never throws: reminders are best-effort on the device.
 */
export async function syncDeviceReminders(plans: Plan[], scope?: Set<string>): Promise<void> {
  if (!deviceRemindersSupported) return;
  try {
    configure();
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    const existing = (await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier);
    const { cancel, schedule } = reconcile(existing, desiredDeviceReminders(plans), scope);
    await Promise.all(cancel.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    for (const r of schedule) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.identifier,
        content: { title: r.title, body: r.body, data: { planId: r.planId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.fireAt, channelId: CHANNEL },
      });
    }
  } catch {
    // A device that can't schedule still gets the in-app reminder from the server.
  }
}

/** Cancels every device reminder for one plan (after delete). */
export async function cancelDeviceReminders(planId: string): Promise<void> {
  if (!deviceRemindersSupported) return;
  try {
    const existing = (await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier);
    const { cancel } = reconcile(existing, [], new Set([planId]));
    await Promise.all(cancel.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  } catch {
    // Nothing else to do; the server no longer sends reminders for a deleted plan.
  }
}

/** Calls `open(planId)` when the user taps a plan reminder, including the tap that launched the app. */
export function listenForReminderTaps(open: (planId: string) => void): () => void {
  if (!deviceRemindersSupported) return () => undefined;
  configure();
  const handled = new Set<string>();
  const handle = (r: Notifications.NotificationResponse | null) => {
    const id = r?.notification.request.identifier;
    const planId = r?.notification.request.content.data?.planId;
    if (!r || !id || handled.has(id) || typeof planId !== 'string') return;
    handled.add(id);
    // Cleared so the same tap can't reopen this plan on a later launch.
    Notifications.clearLastNotificationResponse();
    open(planId);
  };
  handle(Notifications.getLastNotificationResponse());
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

/**
 * Re-reads upcoming plans (yesterday to 60 days ahead) from the server and makes the device's reminders match exactly.
 * Run after every change and when the planner opens; plans further out get their device reminder once they come
 * within that window (the server's in-app reminder doesn't depend on this).
 */
export async function refreshDeviceReminders(): Promise<void> {
  if (!deviceRemindersSupported) return;
  try {
    const now = Date.now();
    const plans = await fetchPlansInRange({ from: new Date(now - 86_400_000).toISOString(), to: new Date(now + 60 * 86_400_000).toISOString() });
    await syncDeviceReminders(plans);
  } catch {
    // Offline or signed out: keep what is scheduled; the next refresh corrects it.
  }
}
