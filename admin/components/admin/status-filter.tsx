'use client';
import { statusLabel } from './shared';

export function StatusFilter({ value, onChange, statuses }: { value: string; onChange: (value: string) => void; statuses: readonly string[] }) {
  return <label className="mb-4 flex items-center gap-3 text-sm font-semibold">Status<select className="rounded-lg border border-line bg-surface px-3 py-2 text-text" value={value} onChange={(e) => onChange(e.target.value)}><option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>;
}
