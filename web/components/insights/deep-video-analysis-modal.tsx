'use client';
import { Modal } from '@/components/ui/dialog';
import type { Performer } from '@/types/api';
import { ContentReview } from './content-review';
export function DeepVideoAnalysisModal({ open, onOpenChange, item }: { open: boolean; onOpenChange: (open: boolean) => void; item: Pick<Performer, 'mediaId' | 'title' | 'caption'> | null }) {
  return <Modal open={open} onOpenChange={onOpenChange} title="Deep video analysis" description="Scene-by-scene evidence, hook, audio, storytelling and performance." className="max-w-2xl max-h-[90vh] overflow-y-auto">
    {open && item && <div className="space-y-5"><h3 className="text-base">{item.title || item.caption}</h3><ContentReview key={item.mediaId} mediaId={item.mediaId} isVideo type="deep" /></div>}
  </Modal>;
}
