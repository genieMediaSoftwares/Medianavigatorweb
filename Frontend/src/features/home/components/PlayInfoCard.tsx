import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
type IconName = ComponentProps<typeof Ionicons>['name'];

export function PlayInfoCard({ icon, iconColor, iconBackground, eyebrow, title, message, onPress }: {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  eyebrow: string;
  title: string;
  message: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${message}`}
      className="mb-md flex-row items-center rounded-[18px] border border-neutral-100 bg-neutral-50 px-lg py-lg active:opacity-80"
    >
      <View className="h-[52px] w-[52px] items-center justify-center rounded-full" style={{ backgroundColor: iconBackground }}>
        <Ionicons name={icon} size={26} color={iconColor} />
      </View>
      <View className="ml-lg flex-1">
        <Text className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{eyebrow}</Text>
        <Text className="mt-[2px] text-[16px] font-bold leading-[21px] text-navy">{title}</Text>
        <Text className="mt-[3px] text-[12px] leading-[17px] text-neutral-500">{message}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.navy} style={{ marginLeft: 8 }} />
    </Pressable>
  );
}

