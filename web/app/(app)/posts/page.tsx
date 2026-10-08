import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RouteLoading } from '@/components/layout/RouteStates';
import { PostsView } from './PostsView';

export const metadata: Metadata = { title: 'Posts' };

export default function PostsPage() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <PostsView />
    </Suspense>
  );
}
