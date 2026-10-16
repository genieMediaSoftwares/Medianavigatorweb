'use client';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Performer } from '@/types/api';
import { ContentReview } from './content-review';
interface Props { open: boolean; onOpenChange: (open: boolean) => void; item: Performer | null; type: 'top' | 'bottom'; onOpenFullDetail?: (id: string) => void; onOpenVideoAnalysis?: (item: Performer) => void }
export function WhyPerformerModal({ open, onOpenChange, item, type, onOpenFullDetail }: Props) {
  return <Modal open={open} onOpenChange={onOpenChange} title={type === 'top' ? 'Why this post ranks near the top' : 'Why this post ranks near the bottom'} description="Actual content, measured performance and specific improvements." className="max-w-2xl max-h-[90vh] overflow-y-auto">
    {open && item && <div className="space-y-5"><h3 className="text-base">{item.title || item.caption}</h3><ContentReview key={`${item.mediaId}-${type}`} mediaId={item.mediaId} isVideo={['reel', 'short', 'video'].includes(item.contentType)} type={type === 'top' ? 'why_top' : 'why_bottom'} />{onOpenFullDetail && <Button variant="secondary" onClick={() => { onOpenChange(false); onOpenFullDetail(item.mediaId); }}>Open post details</Button>}</div>}
  </Modal>;
}
