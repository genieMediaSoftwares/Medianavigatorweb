'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error';
interface ToastItem { id: number; tone: ToastTone; message: string }

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

/** The one toast style. Announced politely to screen readers; errors assertively. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = next.current++;
    setItems((all) => [...all.slice(-2), { id, tone, message }]);
    window.setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 4500);
  }, [dismiss]);

  return (
    <ToastContext value={show}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-[var(--shadow-card)]',
              t.tone === 'error' ? 'border-bad-fg/30 bg-bad-bg text-bad-fg' : 'border-line bg-surface text-ink',
            )}
          >
            {t.tone === 'error' ? <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-good-fg" aria-hidden />}
            <p className="flex-1 text-[15px]">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} className="-m-2 grid size-11 place-items-center rounded-lg" aria-label="Dismiss">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
