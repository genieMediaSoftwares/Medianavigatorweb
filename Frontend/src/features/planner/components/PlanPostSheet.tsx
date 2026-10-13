import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/constants/colors';
import { PLATFORM_META, PLATFORM_ORDER } from '@/features/connections/platforms';
import { DAY_NAMES } from '@/lib/format';
import type { Platform, Weekday } from '@/types/api';

import { addPlannedItem } from '../api';
import { nextDateFor } from '../presentation';
import { normaliseTime } from '../time';

export function Chips<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: (v: T) => string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-lg">
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`mr-sm min-h-10 justify-center rounded-full px-md ${selected ? 'bg-navy' : 'bg-neutral-100'}`}
          >
            <Text className={`text-label ${selected ? 'font-semibold text-white' : 'text-navy'}`}>{label(option)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export interface PlanPrefill {
  day?: Weekday;
  time?: string;
  platform?: Platform;
  contentType?: string;
  /** Why this slot was suggested, shown above the form. */
  reason?: string;
}

/**
 * Saves a plan (a reminder) in Media Navigator. Media Navigator is read-only on every platform, so nothing is
 * scheduled or published, and the sheet says so.
 */
export function PlanPostSheet({ visible, onClose, onAdded, prefill, timezone, platforms }: {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  prefill: PlanPrefill;
  timezone: string;
  /** Platforms the user can plan for (connected first). */
  platforms: readonly Platform[];
}) {
  const [title, setTitle] = useState('');
  const [day, setDay] = useState<Weekday>(prefill.day ?? 'Monday');
  const [time, setTime] = useState(prefill.time ?? '');
  const [platform, setPlatform] = useState<Platform>(prefill.platform ?? platforms[0] ?? 'instagram');
  const [contentType, setContentType] = useState(prefill.contentType ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const normalised = normaliseTime(time);
    if (!title.trim() || !normalised) {
      setError(title.trim() ? 'Enter a time like 6:00 PM.' : 'Add a title and a time.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addPlannedItem({ title: title.trim(), day, time: normalised, platform, ...(contentType.trim() && { contentType: contentType.trim() }) });
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  };

  const options = platforms.length ? platforms : PLATFORM_ORDER;
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Plan a post" closeLabel="Cancel">
      {prefill.reason ? (
        <View className="mb-lg flex-row rounded-lg border border-sky-border bg-sky p-md">
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
          <Text className="ml-sm flex-1 text-label font-normal text-navy">{prefill.reason}</Text>
        </View>
      ) : null}
      {error ? <Notice variant="error" message={error} /> : null}
      <TextField label="Title" value={title} onChangeText={setTitle} maxLength={300} placeholder="What will you post?" />
      <Text className="mb-xs text-label text-navy">Platform</Text>
      <Chips options={options} value={platform} onChange={setPlatform} label={(p) => PLATFORM_META[p].name} />
      <Text className="mb-xs text-label text-navy">Day</Text>
      <Chips options={DAY_NAMES} value={day} onChange={setDay} label={(d) => d.slice(0, 3)} />
      <TextField label={`Time (${timezone})`} value={time} onChangeText={setTime} maxLength={20} placeholder="6:00 PM" hint={`Next ${day}: ${nextDateFor(day, timezone)}. You can change the time.`} />
      <TextField label="Format (optional)" value={contentType} onChangeText={setContentType} maxLength={30} placeholder="e.g. reel" />
      <Text className="mb-md text-[12px] text-neutral-500">
        {`Saved as a plan in Media Navigator. It isn’t scheduled or published on ${PLATFORM_META[platform].name}: post it from ${PLATFORM_META[platform].name} at that time.`}
      </Text>
      <Button title="Save plan" onPress={() => void save()} loading={saving} />
    </BottomSheet>
  );
}
