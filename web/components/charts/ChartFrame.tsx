import type { ReactNode } from 'react';

export interface TableColumn<Row> { label: string; value: (r: Row) => ReactNode }

/**
 * Every chart sits in one of these: a visible one-sentence summary (also the accessible description), the chart itself
 * hidden from screen readers, and the same data as a table for anyone who prefers it.
 */
export function ChartFrame<Row>({ summary, children, rows, columns, caption }: {
  summary: string;
  children: ReactNode;
  rows: Row[];
  columns: Array<TableColumn<Row>>;
  caption: string;
}) {
  return (
    <figure>
      <figcaption className="mb-3 text-[15px] text-ink-muted">{summary}</figcaption>
      <div aria-hidden className="h-64 w-full">{children}</div>
      <details className="no-print mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-ink-muted hover:text-ink">Show as table</summary>
        <div className="mt-2 max-h-72 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr className="text-ink-muted">{columns.map((c) => <th key={c.label} scope="col" className="py-1.5 pr-4 font-semibold">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-line">{columns.map((c) => <td key={c.label} className="py-1.5 pr-4">{c.value(r)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
