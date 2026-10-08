'use client';

import { useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileUp, Folder, Trash2 } from 'lucide-react';
import { filesApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { qk } from '@/lib/query-keys';
import { formatBytes, formatDate } from '@/lib/format';
import { useMe, useServiceStatus } from '@/lib/hooks';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog, useConfirm } from '@/components/ui/Dialog';
import { SelectField } from '@/components/ui/Field';
import { EmptyState, ErrorState, FormError, ListSkeleton, errorMessage } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import type { StoredFile } from '@/types/api';

/** Mirrors the API's allow-list (FILE_ALLOWED_MIME_TYPES); the API is still the one that decides. */
const ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.mp4,.csv,.txt';
const NOT_SET_UP = "File storage isn't set up on this server yet, so uploads are turned off.";

export function FilesView() {
  const status = useServiceStatus();
  if (status.isPending) return <ListSkeleton rows={2} />;
  if (status.isError) return <ErrorState error={status.error} onRetry={() => status.refetch()} />;
  if (!status.data.storage.available) {
    return <EmptyState icon={<Folder className="size-6" />} title="Files aren't available" body={NOT_SET_UP} className="max-w-3xl" />;
  }
  return <Files />;
}

function Files() {
  const tz = useMe().data?.profile?.timezone;
  const client = useQueryClient();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [purpose, setPurpose] = useState<'document' | 'media' | 'avatar'>('document');
  const confirm = useConfirm<StoredFile>();
  const files = useInfiniteQuery({
    queryKey: qk.files,
    queryFn: ({ pageParam }) => filesApi.page({ cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const upload = useMutation({
    mutationFn: (f: File) => filesApi.upload(f, purpose),
    onSuccess: () => {
      if (input.current) input.current.value = '';
      void client.invalidateQueries({ queryKey: qk.files });
      toast('File uploaded.');
    },
  });
  const open = useMutation({
    mutationFn: filesApi.access,
    onSuccess: (f) => window.open(f.url, '_blank', 'noopener,noreferrer'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => filesApi.remove(id),
    onSuccess: () => {
      confirm.close();
      void client.invalidateQueries({ queryKey: qk.files });
      toast('File deleted.');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const items = files.data?.pages.flatMap((p) => p.items) ?? [];
  const uploadError = upload.error instanceof ApiError && upload.error.status === 503 ? NOT_SET_UP : upload.error instanceof ApiError && upload.error.status === 413 ? 'That file is too large.' : upload.error;

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader title="Upload a file" description="Images, PDFs, MP4 videos, CSV or text files." />
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = input.current?.files?.[0]; if (f) upload.mutate(f); }}>
          {upload.isError ? <FormError error={uploadError} /> : null}
          <div>
            <label htmlFor="file" className="block text-[15px] font-semibold">File</label>
            <input id="file" ref={input} type="file" accept={ACCEPT} className="mt-1.5 block min-h-11 w-full text-[15px] file:mr-3 file:min-h-11 file:rounded-[var(--radius-control)] file:border file:border-line-strong file:bg-surface file:px-4 file:font-semibold" />
          </div>
          <SelectField label="What is it for?" value={purpose} onChange={(e) => setPurpose(e.target.value as typeof purpose)}>
            <option value="document">A document</option>
            <option value="media">Media for a post</option>
            <option value="avatar">My profile picture</option>
          </SelectField>
          <Button type="submit" loading={upload.isPending} icon={<FileUp className="size-4" aria-hidden />}>Upload</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Your files" />
        {files.isPending ? <ListSkeleton rows={3} /> : files.isError ? <ErrorState error={files.error} onRetry={() => files.refetch()} /> : items.length === 0 ? (
          <EmptyState icon={<Folder className="size-6" />} title="No files yet" body="Files you upload will be listed here." className="border-0 bg-transparent py-6" />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{f.name}</p>
                  <p className="text-sm text-ink-muted">{formatBytes(f.size)} · {formatDate(f.createdAt, tz)}</p>
                </div>
                <Button variant="ghost" size="sm" loading={open.isPending && open.variables === f.id} onClick={() => open.mutate(f.id)} icon={<ExternalLink className="size-4" aria-hidden />}>Open</Button>
                <button type="button" onClick={() => confirm.ask(f)} className="grid size-11 place-items-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-bad-fg" aria-label={`Delete ${f.name}`}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {files.hasNextPage ? <Button variant="secondary" className="mt-4" loading={files.isFetchingNextPage} onClick={() => files.fetchNextPage()}>Show more</Button> : null}
      </Card>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(o) => !o && confirm.close()}
        title="Delete this file?"
        consequence={`"${confirm.target?.name ?? ''}" will be permanently deleted.`}
        confirmLabel="Delete file"
        onConfirm={() => confirm.target && remove.mutate(confirm.target.id)}
        pending={remove.isPending}
      />
    </div>
  );
}
