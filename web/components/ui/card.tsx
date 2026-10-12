import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-sky-100/90 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(0,163,255,0.06)] transition-all duration-200 dark:border-sky-900/40 dark:bg-slate-900/95 dark:shadow-none', className)} {...props} />;
}

export function SectionHeader({ title, description, action, className }: { title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h2 className="text-xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
