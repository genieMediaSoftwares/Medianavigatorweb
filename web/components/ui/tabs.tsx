'use client';

import { cn } from '@/lib/utils';

export interface TabItem { id: string; label: string; count?: number }

/** Simple controlled tab strip. Pages keep the active tab in the URL so deep links and reloads work. */
export function TabBar({ tabs, value, onChange, label }: { tabs: TabItem[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="custom-scroll -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button key={t.id} role="tab" aria-selected={active} id={`tab-${t.id}`} onClick={() => onChange(t.id)}
            className={cn('relative h-11 shrink-0 px-4 text-[15px] font-semibold transition-colors', active ? 'text-brand-600 dark:text-brand-300' : 'text-muted hover:text-ink')}>
            {t.label}{t.count !== undefined && <span className="ml-1.5 text-xs font-bold text-subtle tabular">{t.count}</span>}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-brand-50/50 p-1 dark:border-slate-800 dark:bg-slate-900">
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={cn('h-10 shrink-0 rounded-lg px-3.5 text-sm font-medium transition-all duration-150', o.value === value ? 'bg-white text-brand-800 shadow-xs' : 'text-muted hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-800')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
