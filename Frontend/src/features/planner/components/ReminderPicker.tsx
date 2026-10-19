import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { deviceRemindersSupported, reminderPermission, requestReminderPermission, type ReminderPermission } from '../deviceReminders';
import { REMINDER_OPTIONS } from '../planRules';
import { Chips } from './Chips';

/**
 * Reminder offsets for a plan. The server always adds the reminder to the in-app Notifications list; on a phone it is
 * also scheduled as a device notification once the user allows notifications. The copy says which one applies.
 */
export function ReminderPicker({ value, onChange, hasDate }: { value: number[]; onChange: (v: number[]) => void; hasDate: boolean }) {
  const [permission, setPermission] = useState<ReminderPermission>(deviceRemindersSupported ? 'undetermined' : 'unsupported');
  useEffect(() => {
    let live = true;
    void reminderPermission().then((p) => live && setPermission(p), () => undefined);
    return () => {
      live = false;
    };
  }, []);

  const toggle = async (offset: number) => {
    const next = value.includes(offset) ? value.filter((o) => o !== offset) : [...value, offset];
    onChange(next);
    if (next.length > value.length && permission === 'undetermined') setPermission(await requestReminderPermission());
  };

  const status =
    !value.length ? 'No reminder.'
    : permission === 'granted' ? 'You’ll get a phone notification and an entry in Notifications.'
    : permission === 'denied' ? 'Phone notifications are off for Media Navigator, so reminders appear only in the in-app Notifications list.'
    : permission === 'unsupported' ? 'Reminders appear in the in-app Notifications list (phone notifications need the mobile app).'
    : 'Allow notifications to also get them on this phone.';

  return (
    <View>
      <Chips multi wrap accessibilityLabel="Reminders" options={REMINDER_OPTIONS.map((o) => o.offset)} value={value} label={(o) => REMINDER_OPTIONS.find((x) => x.offset === o)!.label} onChange={(o) => void toggle(o)} />
      <Text className="text-[12px] leading-[17px] text-neutral-500">{hasDate ? status : 'Reminders start once the post has a date.'}</Text>
      {permission === 'denied' && value.length ? (
        <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="link" className="mt-xs min-h-10 justify-center self-start">
          <Text className="text-label font-semibold text-primary">Open notification settings</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
