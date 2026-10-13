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
    variant === 'primary' && 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm active:brightness-95 transition-all duration-200',
    variant === 'secondary' && 'bg-surface text-ink border border-line shadow-2xs hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 dark:bg-slate-900/90 dark:border-slate-800 dark:hover:bg-slate-800/80 transition-all duration-200',
    variant === 'ghost' && 'text-brand-600 hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-slate-800/60 transition-all duration-200',
    variant === 'danger' && 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm active:brightness-95 transition-all duration-200',
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
