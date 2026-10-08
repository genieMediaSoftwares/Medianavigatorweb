import { cn } from '@/lib/utils';

export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden="true" className={cn('skeleton h-6', className)} />;

/** Shaped like the real stat cards, so the page does not jump when data arrives. */
export function StatRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <StatRowSkeleton />
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

export function PostGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]" role="status" aria-label="Loading posts">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card overflow-hidden">
          <Skeleton className="aspect-[4/5] rounded-none" />
          <div className="space-y-3 p-4"><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-9" /></div>
        </div>
      ))}
    </div>
  );
}
