import type { ReactNode } from 'react';
import { Ruler, Calculator, Lightbulb, Sparkles, Info } from 'lucide-react';
import type { AiMeta } from '@/types/api';
import { cn } from '@/lib/cn';

const LAYERS = {
  measured: { title: 'What we measured', note: 'Straight from the platform.', icon: Ruler },
  calculated: { title: 'What we calculated', note: 'Compared with your own posts.', icon: Calculator },
  meaning: { title: 'What it may mean', note: 'An interpretation, not a fact.', icon: Lightbulb },
} as const;

/**
 * The three layers stay visibly separate everywhere: measured numbers, our calculations, and interpretation.
 * Each has its own icon and heading so they are never mixed up.
 */
export function Layer({ kind, children, className, aside }: { kind: keyof typeof LAYERS; children: ReactNode; className?: string; aside?: ReactNode }) {
  const L = LAYERS[kind];
  const Icon = L.icon;
  return (
    <section className={cn('rounded-[var(--radius-card)] border border-line bg-surface p-5', kind === 'meaning' && 'border-dashed', className)} aria-label={L.title}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-surface-2 text-ink-muted" aria-hidden>
            <Icon className="size-4" />
          </span>
          <div>
            <h3 className="font-semibold text-ink">{L.title}</h3>
            <p className="text-sm text-ink-subtle">{L.note}</p>
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * Honest AI labelling. "ran" and "cached" mean a model actually produced the interpretation; every other status means
 * the text shown is measured facts only.
 */
export function AiStatusNote({ ai }: { ai: AiMeta }) {
  if (ai.status === 'ran' || ai.status === 'cached') {
    return (
      <p className="inline-flex items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-[13px] font-semibold text-info-fg">
        <Sparkles className="size-3.5" aria-hidden />
        Explained by AI{ai.status === 'cached' ? ' (saved from earlier)' : ''}
      </p>
    );
  }
  const why = ai.status === 'not_needed' ? 'There was nothing to explain yet.' : "AI explanation isn't available right now, so you're seeing measured facts only.";
  return (
    <p className="flex items-start gap-2 rounded-xl bg-neutral-bg px-3 py-2 text-sm text-neutral-fg" role="note">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{why}</span>
    </p>
  );
}

export const aiRan = (ai: AiMeta) => ai.status === 'ran' || ai.status === 'cached';
