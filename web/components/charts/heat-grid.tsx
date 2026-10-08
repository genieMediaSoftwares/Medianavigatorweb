'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface HeatCell { col: string; row: string; score: number; count: number }

/** Day x time-of-day grid. Colour strength is only a hint: every cell also says its post count, and empty cells are dashed. */
export function HeatGrid({ cols, rows, cells, best }: { cols: string[]; rows: string[]; cells: HeatCell[]; best?: { col: string; row: string } | null }) {
  const [active, setActive] = useState<HeatCell | null>(null);
  const find = (c: string, r: string) => cells.find((x) => x.col === c && x.row === r);
  const max = Math.max(...cells.map((c) => c.score), 1);
  const tint = (score: number) => {
    const pct = Math.round(15 + (score / max) * 80);
    return `color-mix(in srgb, var(--brand-600) ${pct}%, var(--surface))`;
  };
  const text = (c: HeatCell | null) => (!c ? 'Hover or focus a square to see how many posts it is based on.' : c.count === 0 ? `${c.col} ${c.row.toLowerCase()}: No posts yet.` : `${c.col} ${c.row.toLowerCase()}: ${c.count} ${c.count === 1 ? 'post' : 'posts'}.`);
  return (
    <div>
      <div className="custom-scroll overflow-x-auto pb-1">
        <div className="grid min-w-[420px] gap-1.5" style={{ gridTemplateColumns: `76px repeat(${cols.length}, minmax(0, 1fr))` }} role="group" aria-label="Posting times by day and time of day">
          <div />
          {cols.map((c) => <div key={c} className="pb-1 text-center text-[13px] font-semibold text-muted">{c}</div>)}
          {rows.map((r) => (
            <div key={r} className="contents">
              <div className="flex items-center text-[13px] font-semibold text-muted">{r}</div>
              {cols.map((c) => {
                const cell = find(c, r) ?? { col: c, row: r, score: 0, count: 0 };
                const empty = cell.count === 0;
                const isBest = best?.col === c && best?.row === r;
                return (
                  <button key={c} type="button" onMouseEnter={() => setActive(cell)} onFocus={() => setActive(cell)} onClick={() => setActive(cell)}
                    aria-label={empty ? `${c} ${r}: No posts yet` : `${c} ${r}: ${cell.count} ${cell.count === 1 ? 'post' : 'posts'}${isBest ? ', your best time' : ''}`}
                    className={cn('flex h-14 items-center justify-center rounded-lg text-xs font-bold tabular transition-transform hover:scale-[1.04]', empty ? 'border border-dashed border-line-strong bg-transparent text-subtle' : 'border border-transparent text-white', isBest && 'ring-2 ring-offset-2 ring-offset-surface ring-brand-800')}
                    style={empty ? undefined : { background: tint(cell.score), color: cell.score / max > 0.45 ? '#fff' : 'var(--ink)' }}>
                    {empty ? <span className="text-[11px] font-medium leading-tight">No posts yet</span> : cell.count}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="mt-3 min-h-6 text-sm text-muted">{text(active)}</p>
    </div>
  );
}
