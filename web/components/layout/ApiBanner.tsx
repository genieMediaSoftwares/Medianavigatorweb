'use client';

import { WifiOff } from 'lucide-react';
import { useReachable } from '@/components/providers/reachability';

export function ApiBanner() {
  const reachable = useReachable();
  if (reachable) return null;
  return (
    <div role="alert" className="no-print flex items-start gap-3 border-b border-warn-fg/30 bg-warn-bg px-4 py-3 text-[15px] text-warn-fg sm:px-6">
      <WifiOff className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>We couldn&apos;t reach Media Navigator. Check your connection, and that the API address is configured.</p>
    </div>
  );
}
