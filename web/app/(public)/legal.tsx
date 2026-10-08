import type { ReactNode } from 'react';

export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">{title}</h1>
      <div className="mt-4 text-lg text-ink-muted">{intro}</div>
      <div className="mt-8 space-y-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2 [&_p]:text-ink-muted [&_ul]:mt-2 [&_ul]:space-y-1 [&_ul]:text-ink-muted">
        {children}
      </div>
    </article>
  );
}
