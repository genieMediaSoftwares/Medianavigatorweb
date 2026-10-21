'use client';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ContentType, Performer } from '@/types/api';
import { ContentDiagnosis } from '../posts/content-diagnosis';
interface Props { open: boolean; onOpenChange: (open: boolean) => void; item: Performer | null; type: 'top' | 'bottom'; onOpenFullDetail?: (id: string) => void; onOpenVideoAnalysis?: (item: Performer) => void }
/**
 * Why a post ranks near the top or the bottom. The diagnosis adapts itself to the post's own
 * performance, so the same component answers differently for a top and a bottom performer.
 */
export function WhyPerformerModal({ open, onOpenChange, item, type, onOpenFullDetail }: Props) {
  return <Modal open={open} onOpenChange={onOpenChange} title={type === 'top' ? 'Why this post ranks near the top' : 'Why this post ranks near the bottom'} description="Actual content, measured performance and specific improvements." className="max-w-2xl max-h-[90vh] overflow-y-auto">
    {open && item && <div className="space-y-5"><h3 className="text-base">{item.title || item.caption}</h3><ContentDiagnosis key={item.mediaId} mediaId={item.mediaId} thumbnailUrl={item.thumbnailUrl} title={item.title || item.caption} platform={item.platform} contentType={item.contentType as ContentType} />{onOpenFullDetail && <Button variant="secondary" onClick={() => { onOpenChange(false); onOpenFullDetail(item.mediaId); }}>Open post details</Button>}</div>}
  </Modal>;
}
