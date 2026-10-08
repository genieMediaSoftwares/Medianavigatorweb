'use client';

import * as Popover from '@radix-ui/react-popover';
import * as Tooltip from '@radix-ui/react-tooltip';
import { CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';

/** The only place where precise statistic names are allowed: a small "How is this calculated?" popover. */
export function HelpPopover({ children, label = 'How is this calculated?' }: { children: ReactNode; label?: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={label} className="inline-flex h-6 w-6 items-center justify-center rounded-full text-subtle hover:bg-brand-50 hover:text-brand-600"><CircleHelp className="h-4 w-4" /></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} className="z-50 w-72 rounded-xl border border-line bg-surface p-4 text-sm text-muted shadow-[var(--shadow-pop)] animate-rise">
          <p className="mb-1 font-semibold text-ink">{label}</p>{children}
          <Popover.Arrow className="fill-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Hint({ content, children }: { content: string; children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal><Tooltip.Content sideOffset={6} className="z-50 max-w-60 rounded-lg bg-ink px-3 py-2 text-[13px] text-surface shadow-[var(--shadow-pop)]">{content}</Tooltip.Content></Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
