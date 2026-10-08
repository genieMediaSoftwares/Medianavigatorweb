'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export function Modal({ open, onOpenChange, title, description, children, className }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-[rgba(2,16,54,0.5)] backdrop-blur-[2px] animate-fade" />
        <RadixDialog.Content className={cn('fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface p-6 shadow-[var(--shadow-pop)] animate-rise focus:outline-none', className)}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="font-display text-xl font-bold text-ink">{title}</RadixDialog.Title>
              {description ? <RadixDialog.Description className="mt-1 text-sm text-muted">{description}</RadixDialog.Description> : <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close aria-label="Close" className="-mr-2 -mt-1 flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-brand-50"><X className="h-5 w-5" /></RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Side drawer used for post details. Full width on phones. */
export function Drawer({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-[rgba(2,16,54,0.45)] animate-fade" />
        <RadixDialog.Content className="custom-scroll fixed right-0 top-0 z-50 h-full w-full max-w-[560px] overflow-y-auto bg-app shadow-[var(--shadow-pop)] animate-slide-in focus:outline-none">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-6 py-4">
            <RadixDialog.Title className="font-display text-lg font-bold text-ink">{title}</RadixDialog.Title>
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
            <RadixDialog.Close aria-label="Close" className="-mr-2 flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-brand-50"><X className="h-5 w-5" /></RadixDialog.Close>
          </div>
          <div className="p-6">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** The one confirmation pattern. Destructive actions say what will happen in one sentence. */
export function ConfirmDialog({ open, onOpenChange, title, message, confirmLabel, onConfirm, danger = true, children }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<unknown> | void;
  danger?: boolean;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <p className="text-[15px] text-muted">{message}</p>
      {children}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(); onOpenChange(false); } finally { setBusy(false); } }}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
