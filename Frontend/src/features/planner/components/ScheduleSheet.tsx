import { useState } from 'react';
import { Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import type { PlanFormat, Platform } from '@/types/api';

import { formatDay, formatTime, todayIn, zonedToUtc, type LocalDate, type LocalTime } from '../dates';
import { BestTimeHint } from './BestTimeHint';
import { Calendar } from './Calendar';
import { TimePicker } from './TimePicker';

/** Pick a real date and time for a plan (schedule, reschedule, or date an idea / older plan). */
export function ScheduleSheet({ title, platform, format, timezone, initialDate, initialTime, saving, error, onSave, onClose }: {
  title: string;
  platform: Platform;
  format: PlanFormat | null;
  timezone: string;
  initialDate: LocalDate | null;
  initialTime: LocalTime | null;
  saving: boolean;
  error: string | null;
  onSave: (date: LocalDate, time: LocalTime) => void;
  onClose: () => void;
}) {
  const today = todayIn(timezone);
  const [date, setDate] = useState<LocalDate>(initialDate ?? today);
  const [time, setTime] = useState<LocalTime | null>(initialTime);
  const [openedAt] = useState(() => Date.now());
  const shifted = time ? zonedToUtc(date, time, timezone).shifted : false;
  const past = time ? zonedToUtc(date, time, timezone).date.getTime() < openedAt : false;

  return (
    <BottomSheet visible onClose={onClose} title={title} closeLabel="Cancel">
      {error ? <Notice variant="error" message={error} /> : null}
      <Calendar today={today} selected={date} onSelect={setDate} view="month" compact />
      <View className="mt-md">
        <BestTimeHint platform={platform} format={format} date={date} timezone={timezone} onUseTime={setTime} />
        <TimePicker value={time} onChange={setTime} />
      </View>
      <Text className="mb-md mt-sm text-[12px] text-neutral-500">{`${formatDay(date, today)}${time ? ` at ${formatTime(time)}` : ''} · ${timezone}`}</Text>
      {shifted ? <Notice variant="warning" message="That time is skipped by a daylight-saving change, so it will be saved as the next valid time." /> : null}
      {past ? <Notice variant="info" message="This time has already passed. Saving it will show the post as missed unless you mark it published." /> : null}
      <Button title="Save date and time" onPress={() => time && onSave(date, time)} disabled={!time} loading={saving} />
    </BottomSheet>
  );
}
