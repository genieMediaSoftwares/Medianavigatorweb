'use client';

import { Check, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/field';
import { passwordRules } from '@/lib/validation/auth';
import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? 'text' : 'password'} className="pr-12" {...props} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:text-ink">
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
});

/** Live checklist under a new-password field. */
export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="mt-2.5 space-y-1.5" aria-label="Password tips">
      {passwordRules.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.id} className={cn('flex items-center gap-2 text-[13px]', ok ? 'text-good' : 'text-muted')}>
            <span className={cn('flex h-4 w-4 items-center justify-center rounded-full', ok ? 'bg-good text-white' : 'border border-line-strong')}>{ok && <Check className="h-3 w-3" aria-hidden="true" />}</span>
            {r.label}<span className="sr-only">{ok ? ' (done)' : ''}</span>
          </li>
        );
      })}
    </ul>
  );
}
