'use client';

import { cn } from '@/lib/utils';

export interface TabItem { id: string; label: string; count?: number }

/** Simple controlled tab strip. Pages keep the active tab in the URL so deep links and reloads work. */
export function TabBar({ tabs, value, onChange, label }: { tabs: TabItem[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="custom-scroll -mx-1 flex gap-1 overflow-x-auto border-b border-sky-100 dark:border-sky-900/40 px-1">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button key={t.id} role="tab" aria-selected={active} id={`tab-${t.id}`} onClick={() => onChange(t.id)}
            className={cn('relative h-11 shrink-0 px-4 text-[15px] font-semibold transition-colors', active ? 'text-sky-600 dark:text-sky-400' : 'text-muted hover:text-ink')}>
            {t.label}{t.count !== undefined && <span className="ml-1.5 text-xs font-bold text-subtle tabular">{t.count}</span>}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 shadow-[0_0_8px_rgba(0,163,255,0.6)]" />}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-sky-200/80 bg-white p-1 shadow-sm dark:border-sky-900/50 dark:bg-slate-900">
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={cn('h-9 rounded-lg px-3.5 text-sm font-semibold transition-all duration-150', o.value === value ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm' : 'text-muted hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/40')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
