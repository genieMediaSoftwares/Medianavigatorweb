'use client';

import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';

/** Runs before first paint (see root layout) so there is no flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('mn-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}})();`;

const subscribe = (cb: () => void) => { const o = new MutationObserver(cb); o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); return () => o.disconnect(); };
const snapshot = () => document.documentElement.getAttribute('data-theme') ?? 'light';

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'light');
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('mn-theme', next); } catch { /* a remembered theme is a convenience only */ }
  };
  return { theme, toggle };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} className={className ?? 'flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-brand-50'}>
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
