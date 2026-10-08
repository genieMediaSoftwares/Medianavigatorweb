'use client';

import * as RD from '@radix-ui/react-dialog';
import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/cn';

const overlay = 'fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]';

/** The one confirm dialog, used only for destructive actions. `consequence` is one plain sentence. */
export function ConfirmDialog({
  open, onOpenChange, title, consequence, confirmLabel, onConfirm, pending, confirmDisabled, children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  consequence: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  confirmDisabled?: boolean;
  /** Extra inputs (e.g. password) shown above the buttons. */
  children?: ReactNode;
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className={overlay} />
        <RD.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <RD.Title className="text-lg font-semibold text-ink">{title}</RD.Title>
          <RD.Description className="mt-2 text-ink-muted">{consequence}</RD.Description>
          {children ? <div className="mt-4">{children}</div> : null}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <RD.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </RD.Close>
            <Button variant="danger" onClick={onConfirm} loading={pending} disabled={confirmDisabled}>
              {confirmLabel}
            </Button>
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

/** Convenience state holder for ConfirmDialog. */
export function useConfirm<T = true>() {
  const [target, setTarget] = useState<T | null>(null);
  return { target, ask: (t: T) => setTarget(t), close: () => setTarget(null), open: target !== null };
}

/** Side drawer (full screen on phones). */
export function Drawer({ open, onOpenChange, title, description, children, footer }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className={overlay} />
        <RD.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-line bg-canvas shadow-[var(--shadow-card)]',
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line bg-surface px-5 py-4">
            <div className="min-w-0">
              <RD.Title className="text-lg font-semibold text-ink">{title}</RD.Title>
              {description ? <RD.Description className="mt-1 text-sm text-ink-muted">{description}</RD.Description> : <RD.Description className="sr-only">Details</RD.Description>}
            </div>
            <RD.Close className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-surface-2" aria-label="Close">
              <X className="size-5" aria-hidden />
            </RD.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer ? <div className="border-t border-line bg-surface px-5 py-4">{footer}</div> : null}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
