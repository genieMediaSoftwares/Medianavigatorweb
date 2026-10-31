import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// All keys persisted in the device keychain/keystore. Add new keys here.
export const SecureStorageKey = {
  /** The last handwritten dashboard prompt selected on this device. */
  DailyIdea: 'daily_idea',
  /** Short-lived JWT sent as `Authorization: Bearer`. */
  AccessToken: 'access_token',
  /** Opaque, rotating token exchanged at POST /api/v1/auth/refresh for a new pair. */
  RefreshToken: 'refresh_token',
} as const;

export type SecureStorageKeyValue = (typeof SecureStorageKey)[keyof typeof SecureStorageKey];

// expo-secure-store has no web implementation. On the web target the session tokens live in
// sessionStorage: they survive reloads of the tab and are gone when the tab closes (never localStorage).
const web = Platform.OS === 'web';

function webStorage(): Storage | null {
  try {
    return typeof globalThis.sessionStorage === 'undefined' ? null : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export async function getSecureItem(key: SecureStorageKeyValue): Promise<string | null> {
  if (web) return webStorage()?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: SecureStorageKeyValue, value: string): Promise<void> {
  if (web) {
    webStorage()?.setItem(key, value);
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: SecureStorageKeyValue): Promise<void> {
  if (web) {
    webStorage()?.removeItem(key);
    return;
  }
  return SecureStore.deleteItemAsync(key);
}
