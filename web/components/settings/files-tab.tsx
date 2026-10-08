'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Field, Select } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, Notice } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { bytes, dateShort } from '@/lib/format';
import { qk } from '@/lib/queryKeys';
import type { FileItem } from '@/types/api';

const PURPOSES = [{ v: 'avatar', l: 'Profile picture' }, { v: 'media', l: 'Media' }, { v: 'document', l: 'Document' }];
const nameOf = (f: FileItem) => f.originalName ?? f.filename ?? 'Untitled file';
const typeOf = (m: string) => (m === 'application/pdf' ? 'PDF' : m.startsWith('image/') ? m.slice(6).toUpperCase() : m);

export function FilesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [purpose, setPurpose] = useState('document');
  const [uploading, setUploading] = useState(false);
  const [remove, setRemove] = useState<FileItem | null>(null);
  const q = useInfiniteQuery({
    queryKey: qk.files,
    queryFn: ({ pageParam }) => api.files({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: (n, e) => !(e instanceof ApiError && e.status === 503) && n < 1,
  });
  const files = q.data?.pages.flatMap((p) => p.items) ?? [];

  if (q.isError && q.error instanceof ApiError && q.error.status === 503) {
    return <EmptyState icon={<FolderOpen className="h-7 w-7" />} title="File storage isn’t set up yet" description="You can keep using everything else. Uploads will appear here once storage is switched on." />;
  }

  const upload = async (file: File) => {
    setUploading(true);
    try {
      await api.uploadFile(file, purpose);
      await qc.invalidateQueries({ queryKey: qk.files });
      toast.success('File uploaded');
    } catch (e) {
      toast.error(e instanceof ApiError && e.status === 503 ? 'File storage isn’t set up yet.' : e instanceof ApiError ? e.message : 'We couldn’t upload that file.');
    } finally { setUploading(false); if (input.current) input.current.value = ''; }
  };

  const open = async (f: FileItem) => {
    try {
      const full = await api.file(f.id);
      if (!full.url) throw new Error('no url');
      window.open(full.url, '_blank', 'noopener');
    } catch { toast.error('We couldn’t open that file. Please try again.'); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader title="Upload a file" description="PNG, JPEG or PDF. If a file is too large, we'll tell you." />
        <div className="flex max-w-xl flex-col gap-4 sm:flex-row sm:items-end">
          <Field label="What is it for?" className="sm:w-56">{(p) => <Select {...p} value={purpose} onChange={(e) => setPurpose(e.target.value)}>{PURPOSES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</Select>}</Field>
          <input ref={input} id="file-input" type="file" accept="image/png,image/jpeg,application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          <Button variant="secondary" loading={uploading} onClick={() => input.current?.click()}>Choose a file</Button>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Your files" />
        {q.isLoading && <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>}
        {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
        {q.data && files.length === 0 && <p className="py-6 text-center text-[15px] text-muted">You haven’t uploaded anything yet. Choose a file above to add one.</p>}
        {files.length > 0 && (
          <ul className="divide-y divide-line">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden="true">{f.mimeType.startsWith('image/') ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span>
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-semibold text-ink" title={nameOf(f)}>{nameOf(f)}</p>
                  <p className="text-sm text-muted">{typeOf(f.mimeType)} · {bytes(f.size)} · {dateShort(f.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void open(f)}>Open</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemove(f)} aria-label={`Delete ${nameOf(f)}`}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {q.hasNextPage && <div className="mt-4 text-center"><Button variant="secondary" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>Load more</Button></div>}
      </Card>
      <Notice>Links to your files expire after a few minutes, so we create a fresh one each time you press Open.</Notice>
      <ConfirmDialog open={remove !== null} onOpenChange={(o) => !o && setRemove(null)} title="Delete this file?" message="It will be removed for good. This can’t be undone." confirmLabel="Delete file"
        onConfirm={async () => { if (!remove) return; try { await api.deleteFile(remove.id); await qc.invalidateQueries({ queryKey: qk.files }); toast.success('File deleted'); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'We couldn’t delete that file.'); } }} />
    </div>
  );
}
