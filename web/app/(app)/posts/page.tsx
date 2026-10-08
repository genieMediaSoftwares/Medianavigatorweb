import { Suspense } from 'react';
import { PostsView } from '@/components/posts/posts-view';
import { PageSkeleton } from '@/components/ui/skeleton';

export const metadata = { title: 'Posts' };

export default function PostsPage() {
  return <Suspense fallback={<PageSkeleton />}><PostsView /></Suspense>;
}
