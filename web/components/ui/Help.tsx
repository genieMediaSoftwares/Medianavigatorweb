'use client';

import * as Popover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

/** "How is this calculated?" The only place precise statistical terms appear. */
export function HelpPopover({ children, label = 'How is this calculated?' }: { children: ReactNode; label?: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-ink-muted hover:text-ink">
        <HelpCircle className="size-4" aria-hidden />
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          collisionPadding={16}
          className="z-50 w-[min(360px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-4 text-sm text-ink-muted shadow-[var(--shadow-card)]"
        >
          <div className="space-y-2">{children}</div>
          <Popover.Arrow className="fill-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
