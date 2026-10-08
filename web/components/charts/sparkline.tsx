/** Tiny decorative line. Always paired with words, so it is hidden from screen readers. */
export function Sparkline({ values, width = 96, height = 28, className }: { values: number[]; width?: number; height?: number; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (width - 4) + 2},${height - 3 - ((v - min) / span) * (height - 6)}`).join(' ');
  return (
    <svg aria-hidden="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      <polyline points={pts} fill="none" stroke="var(--brand-600)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
