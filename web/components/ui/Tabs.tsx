'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface TabItem { href: string; label: string; active: boolean }

/** URL-backed tabs: every tab has its own address, so deep links and reloads land on the same tab. */
export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="no-print -mx-4 mb-6 overflow-x-auto px-4">
      <ul className="flex w-max min-w-full gap-1 border-b border-line">
        {items.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={t.active ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center border-b-2 px-3 text-[15px] font-semibold transition-colors',
                t.active ? 'border-action text-ink' : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** In-page segmented control for small choices (period, sort). */
export function Segmented<T extends string | number>({ value, onChange, options, label }: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors',
            o.value === value ? 'bg-tint text-action' : 'text-ink-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
