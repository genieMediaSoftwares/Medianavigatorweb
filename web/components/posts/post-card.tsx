'use client';

import { Eye, FileText, GalleryHorizontal, Heart, ImageOff, MessageCircle, Film, Image as ImageIcon, type LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Hint } from '@/components/ui/help';
import { PlatformIcon } from '@/components/ui/platform-logo';
import { compact, dateShort, percent } from '@/lib/format';
import { PLATFORM_ASPECT, platformName, typeLabel } from '@/lib/platforms';
import { TAG_LABEL, TAG_TONE, isUnavailable, type PostTag } from '@/lib/performance';
import { cn } from '@/lib/utils';
import type { MediaItem, Platform } from '@/types/api';

const TYPE_ICON: Record<string, LucideIcon> = { reel: Film, short: Film, video: Film, post: ImageIcon, carousel: GalleryHorizontal, article: FileText };

/** Neutral stand-in for a missing or expired image: the platform and format, never a broken image or an invented photo. */
export function ThumbFallback({ platform, type, label }: { platform: Platform; type: string; label?: string }) {
  const Icon = TYPE_ICON[type] ?? ImageIcon;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-brand-50 text-subtle" title={label}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface"><PlatformIcon platform={platform} className="h-8 w-8" /></span>
      <Icon className="h-5 w-5" aria-hidden="true" />
      {label && <span className="flex items-center gap-1 text-xs font-medium"><ImageOff className="h-3.5 w-3.5" aria-hidden="true" />{label}</span>}
    </div>
  );
}

/** `uniform` gives every thumbnail the same 4:5 box (used in grids so mixed channels line up); wide YouTube frames are shown whole, not cropped. */
export function PostThumb({ item, className, uniform = false }: { item: Pick<MediaItem, 'thumbnailUrl' | 'platform' | 'contentType' | 'title'>; className?: string; uniform?: boolean }) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(item.thumbnailUrl) && !failed;
  return (
    <div className={cn('relative w-full overflow-hidden bg-brand-50', uniform ? 'aspect-[4/5]' : PLATFORM_ASPECT[item.platform], className)}>
      {show
        ? <Image src={item.thumbnailUrl} alt="" fill sizes="(max-width: 640px) 100vw, 320px" unoptimized referrerPolicy="no-referrer" className={item.platform === 'youtube' && uniform ? 'object-contain' : 'object-cover'} onError={() => setFailed(true)} />
        : <ThumbFallback platform={item.platform} type={item.contentType} label={item.thumbnailUrl ? 'Image unavailable' : undefined} />}
    </div>
  );
}

function Metric({ icon: Icon, label, value, na, platform }: { icon: LucideIcon; label: string; value: number; na: boolean; platform: Platform }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted" aria-label={na ? `${label}: not available from ${platformName(platform)}` : `${compact(value)} ${label}`}>
      <Icon className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
      {na ? <Hint content={`Not available from ${platformName(platform)}`}><span className="font-semibold text-subtle">N/A</span></Hint> : <span className="font-semibold text-ink tabular">{compact(value)}</span>}
    </div>
  );
}

/** One card layout for every post, so a grid always looks tidy. */
export function PostCard({ item, tag, onOpen }: { item: MediaItem; tag: PostTag; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="card group flex h-full w-full flex-col overflow-hidden text-left transition-shadow hover:shadow-[var(--shadow-pop)]">
      <div className="relative">
        <PostThumb item={item} uniform />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface/95 shadow-sm"><PlatformIcon platform={item.platform} className="h-5 w-5" /></span>
          <span className="rounded-lg bg-ink/80 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur">{typeLabel(item.contentType, item.contentTypeBasis)}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 min-h-[2.8em] font-display text-[15px] font-bold leading-snug text-ink">{item.title || item.caption || 'Untitled post'}</h3>
          <p className="mt-1 text-[13px] text-subtle">{dateShort(item.publishedAt)}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Metric icon={Eye} label="views" value={item.views} na={isUnavailable(item, 'views')} platform={item.platform} />
          <Metric icon={Heart} label="likes" value={item.likes} na={isUnavailable(item, 'likes')} platform={item.platform} />
          <Metric icon={MessageCircle} label="comments" value={item.comments} na={isUnavailable(item, 'comments')} platform={item.platform} />
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="text-[13px] text-muted">Engagement <strong className="font-bold text-ink tabular">{percent(item.engagementRate)}</strong></span>
          <Badge tone={TAG_TONE[tag]}>{TAG_LABEL[tag]}</Badge>
        </div>
      </div>
    </button>
  );
}
