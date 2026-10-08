import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap select-none transition-colors duration-150 disabled:opacity-55 disabled:pointer-events-none',
    size === 'sm' && 'h-10 px-4 text-sm',
    size === 'md' && 'h-11 px-5 text-[15px]',
    size === 'lg' && 'h-12 px-7 text-base',
    variant === 'primary' && 'bg-brand-600 text-white shadow-[0_1px_2px_rgba(11,95,230,.35)] hover:bg-brand-500 active:bg-brand-800',
    variant === 'secondary' && 'bg-surface text-ink border border-line-strong hover:bg-brand-50 hover:border-brand-200 active:bg-brand-100',
    variant === 'ghost' && 'text-brand-600 hover:bg-brand-50 active:bg-brand-100',
    variant === 'danger' && 'bg-bad text-white hover:opacity-90 active:opacity-100',
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
