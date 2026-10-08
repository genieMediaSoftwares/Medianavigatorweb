'use client';

import { createPref } from '@/lib/prefs';

export type ThemeChoice = 'system' | 'light' | 'dark';

/** A per-device display preference. "system" follows prefers-color-scheme. The root layout applies it before paint. */
const themePref = createPref<ThemeChoice>('mn-theme', (v): v is ThemeChoice => v === 'light' || v === 'dark' || v === 'system', 'system');

export function useTheme() {
  const theme = themePref.use();
  const setTheme = (t: ThemeChoice) => {
    const root = document.documentElement;
    if (t === 'system') delete root.dataset.theme;
    else root.dataset.theme = t;
    themePref.set(t);
  };
  return { theme, setTheme };
}
