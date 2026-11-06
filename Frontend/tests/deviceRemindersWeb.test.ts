import { expect, it, vi } from 'vitest';

vi.mock('expo-notifications', () => { throw new Error('Native notifications must not load on web'); });

it('keeps browser reminders unsupported without loading the native notification listener', async () => {
  const reminders = await import('../src/features/planner/deviceReminders.web');
  expect(reminders.deviceRemindersSupported).toBe(false);
  await expect(reminders.reminderPermission()).resolves.toBe('unsupported');
  await expect(reminders.requestReminderPermission()).resolves.toBe('unsupported');
  await reminders.syncDeviceReminders([]);
  await reminders.cancelDeviceReminders('test');
  await reminders.refreshDeviceReminders();
  const open = vi.fn();
  reminders.listenForReminderTaps(open)();
  expect(open).not.toHaveBeenCalled();
});
