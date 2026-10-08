/** Wordmark: a compass-like mark plus the name. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="var(--brand)" />
        <path d="M16 6.5 19.6 16 16 25.5 12.4 16Z" fill="var(--tint)" />
        <path d="M16 6.5 19.6 16h-7.2Z" fill="#fff" />
      </svg>
      {compact ? null : <span className="font-display text-xl font-semibold tracking-tight text-ink">Media Navigator</span>}
    </span>
  );
}
