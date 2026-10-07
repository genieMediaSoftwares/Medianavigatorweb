import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

/** Consistent page heading used by every screen. */
export const PageHeader: React.FC<{ title: string; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: string }> = ({ title, description, actions, eyebrow }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6 md:mb-8">
    <div className="min-w-0">
      {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
      <h2 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-ink leading-[1.1]">{title}</h2>
      {description && <p className="mt-2 text-[15px] text-body max-w-2xl leading-relaxed">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const Section: React.FC<{ title: string; description?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, description, action, children, className = '' }) => (
  <section className={`mt-8 first:mt-0 ${className}`}>
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-ink">{title}</h3>
        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

type Tone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger';
export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }> = ({ tone = 'neutral', children, dot, className = '' }) => (
  <span className={`badge badge-${tone} ${className}`}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${{ brand: 'bg-brand-500', neutral: 'bg-subtle', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-rose-500' }[tone]}`} />}
    {children}
  </span>
);

export const StatCard: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; delta?: number | null; icon?: React.ReactNode }> = ({ label, value, hint, delta, icon }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="text-sm font-medium text-muted">{label}</div>
      {icon && <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{icon}</div>}
    </div>
    <div className="mt-2 font-display text-[34px] leading-none font-medium tracking-tight text-ink tabular">{value}</div>
    <div className="mt-3 flex items-center gap-2 text-sm min-h-5">
      {delta !== undefined && delta !== null && <Delta value={delta} />}
      {hint && <span className="text-muted">{hint}</span>}
    </div>
  </div>
);

export const Delta: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '%' }) => {
  const up = value > 0.05; const down = value < -0.05;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold tabular ${up ? 'text-emerald-700' : down ? 'text-rose-700' : 'text-muted'}`}>
      <Icon className="w-4 h-4" strokeWidth={2.25} />
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
};

/** Pill-style single-choice control (platform / period pickers). */
export function Segmented<T extends string>({ value, onChange, options, ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; ariaLabel?: string }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex p-1 rounded-xl bg-canvas-soft border border-line">
      {options.map((o) => (
        <button
          key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`px-3.5 h-8 rounded-lg text-sm font-semibold transition-all ${value === o.value ? 'bg-white text-ink shadow-card' : 'text-muted hover:text-ink'}`}
        >{o.label}</button>
      ))}
    </div>
  );
}

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-24' }) => <div className={`skeleton ${className}`} aria-hidden="true" />;

export const PageSkeleton: React.FC = () => (
  <div className="space-y-4" role="status" aria-label="Loading">
    <Skeleton className="h-10 w-1/3" />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
    <Skeleton className="h-72" />
  </div>
);

export const IconTile: React.FC<{ children: React.ReactNode; tone?: 'brand' | 'neutral' | 'success' | 'warning'; className?: string }> = ({ children, tone = 'brand', className = '' }) => (
  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${{ brand: 'bg-brand-50 text-brand-600', neutral: 'bg-canvas-soft text-body', success: 'bg-emerald-50 text-emerald-600', warning: 'bg-amber-50 text-amber-600' }[tone]} ${className}`}>{children}</span>
);

/** Relative time ("42 min ago") for ISO timestamps; falls back to the raw string for legacy values. */
export function timeAgo(iso?: string | null): string {
  if (!iso) return 'never';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export const compact = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/** Horizontal ranked bars: label, value text, proportional fill. */
export const BarList: React.FC<{ rows: { key: string; label: React.ReactNode; value: number; valueLabel: React.ReactNode; sub?: React.ReactNode }[]; max?: number }> = ({ rows, max }) => {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-4">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold text-ink truncate">{r.label}</span>
            <span className="text-sm font-bold tabular text-ink shrink-0">{r.valueLabel}</span>
          </div>
          <div className="mt-1.5 h-2.5 rounded-full bg-canvas-soft overflow-hidden" role="img" aria-label={`${r.value}`}>
            <div className={`h-full rounded-full ${i === 0 ? 'bg-brand-500' : 'bg-brand-300'}`} style={{ width: `${Math.max(2, (r.value / top) * 100)}%` }} />
          </div>
          {r.sub && <div className="mt-1.5 text-xs text-muted">{r.sub}</div>}
        </li>
      ))}
    </ul>
  );
};

/** Compact column chart. `points` are already aggregated; the chart only draws. */
export const ColumnChart: React.FC<{ points: { label: string; value: number }[]; unit?: string; height?: number }> = ({ points, unit = '', height = 160 }) => {
  const max = Math.max(0.0001, ...points.map((p) => p.value));
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }} role="img" aria-label="Bar chart">
        {points.map((p, i) => (
          <div key={i} className="flex-1 min-w-0 h-full flex flex-col justify-end group relative">
            <div className={`w-full rounded-t-md transition-colors ${p.value > 0 ? 'bg-brand-400 group-hover:bg-brand-600' : 'bg-canvas-soft'}`} style={{ height: `${p.value > 0 ? Math.max(4, (p.value / max) * 100) : 3}%` }} />
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-ink text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 z-10">{p.value > 0 ? `${p.value.toFixed(1)}${unit}` : 'No posts'}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2">
        {points.map((p, i) => <div key={i} className="flex-1 min-w-0 text-center text-xs text-muted truncate">{i % Math.ceil(points.length / 6) === 0 ? p.label : ''}</div>)}
      </div>
    </div>
  );
};

export const TabBar: React.FC<{ tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void }> = ({ tabs, value, onChange }) => (
  <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line -mx-1 px-1">
    {tabs.map((t) => (
      <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
        className={`relative px-4 h-11 text-sm font-semibold whitespace-nowrap transition-colors ${value === t.id ? 'text-ink' : 'text-muted hover:text-ink'}`}>
        {t.label}{t.count !== undefined && <span className="ml-1.5 text-xs font-bold text-muted tabular">{t.count}</span>}
        {value === t.id && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-600" />}
      </button>
    ))}
  </div>
);

export const PLATFORM_NAMES: Record<string, string> = { instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook', linkedin: 'LinkedIn' };
export const platformName = (p: string) => PLATFORM_NAMES[p] ?? p;
export const typeLabel = (t: string) => ({ reel: 'Reel', short: 'Short', video: 'Video', post: 'Post', carousel: 'Carousel', article: 'Article' } as Record<string, string>)[t] ?? t;

const THUMB_TINT: Record<string, string> = {
  instagram: 'from-rose-100 via-orange-50 to-amber-100',
  youtube: 'from-red-100 to-orange-50',
  facebook: 'from-sky-100 to-indigo-50',
  linkedin: 'from-blue-100 to-sky-50',
};

/** Thumbnail with a graceful placeholder when the platform has no image or it fails to load. */
export const Thumb: React.FC<{ src?: string; platform: string; type: string; title: string; className?: string }> = ({ src, platform, type, title, className = '' }) => {
  const [failed, setFailed] = React.useState(false);
  const show = Boolean(src) && !failed;
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${THUMB_TINT[platform] ?? 'from-canvas-soft to-white'} ${className}`}>
      {show ? (
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <span className="text-xs font-bold tracking-wide uppercase text-ink/40">{typeLabel(type)}</span>
          <span className="mt-1 text-sm font-semibold text-ink/55 line-clamp-2">{title}</span>
        </div>
      )}
    </div>
  );
};
