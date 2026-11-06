import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { readDailyVibe, type DailyVibe } from './play';

const KEY = 'medianavigator.daily-vibe';
export async function loadVibe(): Promise<DailyVibe | null> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) ?? null : await SecureStore.getItemAsync(KEY);
    const current = readDailyVibe(raw);
    if (raw && !current) {
      if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY);
      else await SecureStore.deleteItemAsync(KEY);
    }
    return current;
  } catch { return null; }
}
export async function saveVibe(vibe: DailyVibe): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (!globalThis.localStorage) return false;
      globalThis.localStorage.setItem(KEY, JSON.stringify(vibe));
    } else await SecureStore.setItemAsync(KEY, JSON.stringify(vibe));
    return true;
  } catch { return false; }
}
