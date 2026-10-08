'use client';

import { Table2, BarChart3 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

export interface TableData { columns: string[]; rows: Array<Array<string | number>> }

/** Accessible wrapper for every chart: caption, a text summary, the chart, and a "Show as table" toggle with the same data. */
export function ChartFrame({ caption, summary, table, children }: { caption: string; summary: string; table: TableData; children: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <figcaption className="text-sm font-semibold text-ink">{caption}</figcaption>
        <button type="button" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} aria-controls={id}
          className="no-print inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-brand-600 hover:bg-brand-50">
          {asTable ? <BarChart3 className="h-4 w-4" aria-hidden="true" /> : <Table2 className="h-4 w-4" aria-hidden="true" />}
          {asTable ? 'Show as chart' : 'Show as table'}
        </button>
      </div>
      <p className="mb-3 text-sm text-muted">{summary}</p>
      <div id={id}>
        {asTable ? (
          <div className="custom-scroll overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="bg-brand-50 text-muted"><tr>{table.columns.map((c, i) => <th key={c} scope="col" className={`px-4 py-2.5 font-semibold ${i > 0 ? 'text-right' : ''}`}>{c}</th>)}</tr></thead>
              <tbody>
                {table.rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-line">
                    {r.map((cell, ci) => ci === 0 ? <th key={ci} scope="row" className="px-4 py-2.5 font-medium text-ink">{cell}</th> : <td key={ci} className="px-4 py-2.5 text-right tabular text-text">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : children}
      </div>
    </figure>
  );
}
