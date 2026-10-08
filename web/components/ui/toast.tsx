'use client';

import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ToastItem { id: number; tone: 'good' | 'bad'; text: string }
interface ToastApi { success: (text: string) => void; error: (text: string) => void }

const Ctx = createContext<ToastApi | null>(null);

/** One toast style for the whole app. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((tone: ToastItem['tone'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, tone, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 5000);
  }, []);
  const api = useMemo<ToastApi>(() => ({ success: (t) => push('good', t), error: (t) => push('bad', t) }), [push]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className={cn('pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-[var(--shadow-pop)] animate-rise', t.tone === 'good' ? 'border-transparent bg-ink text-surface' : 'border-bad bg-surface text-bad')}>
            {t.tone === 'good' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-400" aria-hidden="true" /> : <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />}
            <span>{t.text}</span>
            <button aria-label="Dismiss" onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} className="-mr-1 rounded-lg p-1 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used inside <ToastProvider>');
  return v;
}
