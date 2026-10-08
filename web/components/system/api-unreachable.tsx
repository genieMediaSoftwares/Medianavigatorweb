'use client';

import { WifiOff } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

/** True when the failure means the API could not be reached at all. */
export const isUnreachable = (e: unknown): boolean => e instanceof ApiError && (e.code === 'NETWORK' || e.code === 'API_UNREACHABLE');

export function ApiUnreachableBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-4 rounded-2xl border border-warn/30 bg-warn-bg px-5 py-4 text-warn">
      <WifiOff className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 basis-64 text-[15px] font-medium">We couldn’t reach Media Navigator. Check your connection, and that the API address is configured.</p>
      <Button size="sm" variant="secondary" onClick={onRetry ?? (() => window.location.reload())}>Retry</Button>
    </div>
  );
}
