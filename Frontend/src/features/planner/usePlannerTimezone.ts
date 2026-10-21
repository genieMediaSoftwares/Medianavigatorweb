import { useAuth } from '@/features/auth/auth-context';

import { deviceTimezone, isValidTimezone } from './dates';

/** Plans are made in the profile's timezone, or the device's when the profile has none. */
export function usePlannerTimezone(): { timezone: string; fromProfile: boolean } {
  const { state } = useAuth();
  const profileTz = state.status === 'authenticated' ? state.me.profile?.timezone : null;
  return isValidTimezone(profileTz) ? { timezone: profileTz, fromProfile: true } : { timezone: deviceTimezone(), fromProfile: false };
}
