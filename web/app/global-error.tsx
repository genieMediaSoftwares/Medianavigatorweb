'use client';

import './globals.css';

/** Replaces the root layout when it crashes, so it renders its own <html> and depends on no providers. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-app text-text">
        <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 text-center">
          <h1 className="font-sans text-[28px] font-extrabold text-ink">Media Navigator hit a problem</h1>
          <p className="mt-2 max-w-md text-[15px] text-muted">Something went wrong while loading the app. Please reload the page. Your data is safe.</p>
          <button type="button" onClick={reset} className="mt-8 h-11 rounded-xl bg-brand-600 px-5 text-[15px] font-semibold text-white hover:bg-brand-500">Reload</button>
          {error.digest && <p className="mt-6 text-xs text-subtle">Reference: <span className="font-mono">{error.digest}</span></p>}
        </main>
      </body>
    </html>
  );
}
