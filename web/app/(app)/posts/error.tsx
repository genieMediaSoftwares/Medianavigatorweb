'use client';

import { ErrorState } from '@/components/ui/states';

export default function PostsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} onRetry={reset} />;
}
