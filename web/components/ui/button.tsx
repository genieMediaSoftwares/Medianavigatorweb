import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap select-none transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
    size === 'sm' && 'h-10 px-4 text-sm',
    size === 'md' && 'h-11 px-5 text-[15px]',
    size === 'lg' && 'h-12 px-7 text-base',
    variant === 'primary' && 'bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white shadow-[0_4px_18px_rgba(0,163,255,0.32)] hover:shadow-[0_6px_24px_rgba(0,163,255,0.45)] hover:brightness-105 active:bg-sky-700',
    variant === 'secondary' && 'bg-white text-ink border border-sky-200/80 shadow-sm hover:bg-sky-50/80 hover:border-sky-300 hover:text-sky-700 dark:bg-slate-900 dark:border-sky-900/60 dark:hover:bg-sky-950/40',
    variant === 'ghost' && 'text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-950/40',
    variant === 'danger' && 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm hover:opacity-90 active:opacity-100',
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant, size, loading, className, children, disabled, type = 'button', ...props }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses(variant, size, className)} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export function LinkButton({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
