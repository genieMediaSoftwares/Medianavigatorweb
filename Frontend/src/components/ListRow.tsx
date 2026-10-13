import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

interface ListRowProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  /** Short current value shown before the chevron, e.g. a time zone or "2 connected". */
  value?: string;
  /** Shown instead of the chevron when there is no action, e.g. "Not available yet". */
  status?: string;
  /** Destructive actions (sign out) use the danger color and no chevron. */
  destructive?: boolean;
}

/**
 * Compact settings row (48 dp): outline icon, label, optional value and a chevron when it opens a screen.
 * Rows without onPress render as informational and are not focusable as buttons.
 */
export function ListRow({ icon, label, onPress, value, status, destructive = false }: ListRowProps) {
  const tint = destructive ? colors.danger : onPress ? colors.navy : colors.neutral400;
  const content = (
    <>
      <Ionicons name={icon} size={20} color={tint} />
      <Text className={`ml-lg flex-1 text-[15px] ${destructive ? 'font-semibold text-danger' : onPress ? 'text-navy' : 'text-neutral-500'}`} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text className="ml-md max-w-[45%] text-[13px] text-neutral-500" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {status ? <Text className="ml-md text-caption text-neutral-500">{status}</Text> : null}
      {onPress && !destructive ? <Ionicons name="chevron-forward" size={16} color={colors.neutral400} style={{ marginLeft: 6 }} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View className="min-h-12 flex-row items-center px-lg" accessible accessibilityLabel={[label, value, status].filter(Boolean).join(', ')}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className="min-h-12 flex-row items-center px-lg active:bg-neutral-100"
    >
      {content}
    </Pressable>
  );
}
