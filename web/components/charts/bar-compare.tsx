import { ChartFrame } from './chart-frame';

export interface BarRow { label: string; value: number; display: string; note?: string }

/** Horizontal bars with the value written at the end of each bar (no hover needed). */
export function BarCompare({ caption, summary, rows, valueLabel, noteLabel = 'Posts' }: { caption: string; summary: string; rows: BarRow[]; valueLabel: string; noteLabel?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  return (
    <ChartFrame caption={caption} summary={summary} table={{ columns: ['Name', valueLabel, noteLabel], rows: rows.map((r) => [r.label, r.display, r.note ?? '']) }}>
      <ul className="space-y-3" role="list">
        {rows.map((r, i) => (
          <li key={`${r.label}-${i}`} className="grid grid-cols-[minmax(72px,120px)_1fr] items-center gap-3 sm:grid-cols-[140px_1fr]">
            <span className="truncate text-sm font-medium text-ink" title={r.label}>{r.label}</span>
            <div className="flex items-center gap-3">
              <div className="h-5 min-w-0 flex-1 rounded-md bg-brand-50">
                <div className="h-full rounded-md" style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, background: i === 0 ? 'var(--brand-600)' : 'var(--brand-400)' }} />
              </div>
              <span className="w-24 shrink-0 text-right text-sm tabular text-ink"><strong>{r.display}</strong>{r.note && <span className="block text-xs text-muted">{r.note}</span>}</span>
            </div>
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}
