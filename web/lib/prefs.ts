'use client';

import { useSyncExternalStore } from 'react';

/**
 * Small per-device display preferences (theme, channel filter) kept in localStorage. Every read and write is guarded,
 * because storage can be unavailable (private windows, blocked site data); the app then simply uses the default.
 */
export function createPref<T extends string>(key: string, isValid: (v: string) => v is T, fallback: T) {
  const listeners = new Set<() => void>();
  const read = (): T => {
    try {
      const v = localStorage.getItem(key);
      return v !== null && isValid(v) ? v : fallback;
    } catch {
      return fallback;
    }
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => e.key === key && l();
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener('storage', onStorage);
    };
  };
  return {
    use: () => useSyncExternalStore(subscribe, read, () => fallback),
    set(value: T) {
      try {
        if (value === fallback) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        /* not persisted; the in-memory notification below still updates this tab */
      }
      listeners.forEach((l) => l());
    },
    read,
  };
}
