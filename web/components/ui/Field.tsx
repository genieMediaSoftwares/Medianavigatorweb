'use client';

import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

const control =
  'w-full min-h-11 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 text-[16px] text-ink placeholder:text-ink-subtle focus:border-action focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-[var(--focus)]/40 aria-[invalid=true]:border-bad-fg';

export function FieldShell({ id, label, hint, error, optional, children }: {
  id: string; label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean; children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[15px] font-semibold text-ink">
        {label} {optional ? <span className="font-normal text-ink-subtle">(optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-bad-fg">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

type TextFieldProps = ComponentProps<'input'> & { label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean };

export function TextField({ label, hint, error, optional, id, className, ...rest }: TextFieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cn(control, className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function PasswordField({ label, hint, error, id, ...rest }: Omit<TextFieldProps, 'type'>) {
  const auto = useId();
  const fid = id ?? auto;
  const [shown, setShown] = useState(false);
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={fid}
          type={shown ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
          className={cn(control, 'pr-12')}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[var(--radius-control)] text-ink-muted hover:text-ink"
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
        >
          {shown ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      </div>
    </FieldShell>
  );
}

type SelectFieldProps = ComponentProps<'select'> & { label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean };

export function SelectField({ label, hint, error, optional, id, className, children, ...rest }: SelectFieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} optional={optional}>
      <select
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cn(control, 'pr-8', className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({ label, hint, error, id, className, ...rest }: ComponentProps<'textarea'> & { label: ReactNode; hint?: ReactNode; error?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error}>
      <textarea id={fid} aria-invalid={error ? true : undefined} className={cn(control, 'min-h-24 py-2.5', className)} {...rest} />
    </FieldShell>
  );
}

/** A plain select without a visible label block, for filter bars. The label is still announced. */
export function FilterSelect({ label, className, children, ...rest }: ComponentProps<'select'> & { label: string }) {
  return (
    <label className="inline-flex flex-col gap-1 text-sm font-semibold text-ink-muted">
      <span>{label}</span>
      <select className={cn(control, 'min-w-36 pr-8 font-normal', className)} {...rest}>
        {children}
      </select>
    </label>
  );
}
