import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, platformColors } from '@/constants/colors';
import { PLATFORM_META } from '@/features/connections/platforms';
import type { Platform } from '@/types/api';

/** The platform's logo on its brand color (Instagram keeps its gradient). */
export function PlatformLogo({ platform, size = 44 }: { platform: Platform; size?: number }) {
  return (
    <LinearGradient
      colors={platformColors[platform].logo}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={{ width: size, height: size, borderRadius: size * 0.27, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={PLATFORM_META[platform].icon} size={size * 0.58} color={colors.white} />
    </LinearGradient>
  );
}
