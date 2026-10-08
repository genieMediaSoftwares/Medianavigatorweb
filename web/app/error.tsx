'use client';

import { RouteError } from '@/components/layout/RouteStates';

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <RouteError {...props} />
    </main>
  );
}
