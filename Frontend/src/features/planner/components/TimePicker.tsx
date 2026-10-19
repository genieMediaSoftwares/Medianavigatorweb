import { Text, View } from 'react-native';

import { SegmentedControl } from '@/components/visual/SegmentedControl';

import { formatTime, type LocalTime } from '../dates';
import { Chips } from './Chips';

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MINUTES = ['00', '15', '30', '45'] as const;
const pad = (n: number) => String(n).padStart(2, '0');

/** Hour, minute and AM/PM as taps (no typing), producing a 24-hour "HH:mm". */
export function TimePicker({ value, onChange }: { value: LocalTime | null; onChange: (t: LocalTime) => void }) {
  const [h24, minute] = value ? value.split(':') : ['--', '--'];
  const hour = Number(h24);
  const pm = value ? hour >= 12 : true;
  const hour12 = value ? (hour % 12 === 0 ? 12 : hour % 12) : null;
  // Keep an existing off-grid minute (e.g. a best time like 6:20) selectable.
  const minutes: string[] = value && !MINUTES.includes(minute as (typeof MINUTES)[number]) ? [...MINUTES, minute].sort() : [...MINUTES];
  const make = (h12: number, m: string, isPm: boolean) => `${pad((h12 % 12) + (isPm ? 12 : 0))}:${m}`;

  return (
    <View>
      <Text className="mb-xs text-label text-navy">{value ? `Time: ${formatTime(value)}` : 'Time'}</Text>
      <Chips accessibilityLabel="Hour" options={HOURS} value={hour12} label={(h) => String(h)} onChange={(h) => onChange(make(h, value ? minute : '00', pm))} />
      <View className="flex-row items-start" style={{ gap: 8 }}>
        <View className="flex-1">
          <Chips accessibilityLabel="Minutes" options={minutes} value={value ? minute : null} label={(m) => `:${m}`} onChange={(m) => onChange(make(hour12 ?? 9, m, pm))} />
        </View>
        <View style={{ width: 116 }}>
          <SegmentedControl
            segments={[{ value: 'am', label: 'AM' }, { value: 'pm', label: 'PM' }]}
            value={pm ? 'pm' : 'am'}
            onChange={(v) => onChange(make(hour12 ?? 9, value ? minute : '00', v === 'pm'))}
          />
        </View>
      </View>
    </View>
  );
}
