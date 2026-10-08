'use client';

import { CLASSIFICATION, PLATFORM_LABEL, formatLabel } from '@/lib/copy';
import { formatCompact, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Thumb } from './PostDrawer';
import type { Classification, Media } from '@/types/api';

/** One friendly card per post. Missing metrics read "n/a" with an explanation, never 0. */
export function PostCard({ media: m, classification, tz, onOpen, why }: {
  media: Media;
  classification: Classification;
  tz?: string | null;
  onOpen: (id: string) => void;
  why?: string;
}) {
  const unavailable = new Set(m.unavailableMetrics);
  const tag = CLASSIFICATION[classification];
  const metric = (key: 'views' | 'likes' | 'comments', label: string) => (
    <div>
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className="font-semibold" title={unavailable.has(key) ? `Not available from ${PLATFORM_LABEL[m.platform]}` : undefined}>
        {unavailable.has(key) ? <span className="text-sm font-normal text-ink-subtle">Not available</span> : formatCompact(m[key])}
      </dd>
    </div>
  );
  return (
    <article className="card rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <button type="button" onClick={() => onOpen(m.id)} className="flex w-full gap-4 rounded-[var(--radius-card)] p-4 text-left hover:bg-surface-2" aria-label={`Open details for ${m.title || 'untitled post'}`}>
        <Thumb media={m} className="size-20 sm:size-24" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <PlatformIcon platform={m.platform} className="size-5" />
            <span className="text-sm font-semibold text-ink-muted">{formatLabel(m.contentType, m.contentTypeBasis)}</span>
            <span className="text-sm text-ink-subtle">· {formatDate(m.publishedAt, tz)}</span>
            <Badge tone={tag.tone} className="ml-auto">{tag.label}</Badge>
          </div>
          <h3 className="mt-1.5 line-clamp-2 font-semibold">{m.title || m.caption || 'Untitled post'}</h3>
          {why ? <p className="mt-1 text-[15px] text-ink-muted">{why}</p> : null}
          <dl className="mt-2 grid max-w-sm grid-cols-3 gap-2">
            {metric('views', 'Views')}
            {metric('likes', 'Likes')}
            {metric('comments', 'Comments')}
          </dl>
        </div>
      </button>
    </article>
  );
}
