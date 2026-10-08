'use client';

/** Last-resort error page: replaces the root layout, so it carries its own minimal styles. */
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#faf7f2', color: '#1f1611', fontFamily: 'system-ui, sans-serif', padding: 16 }}>
        <main style={{ maxWidth: 440, textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>Media Navigator hit a problem</h1>
          <p style={{ color: '#5c4f45', fontSize: 16 }}>Something went wrong while loading the app. Reloading usually fixes it.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, minHeight: 44, padding: '0 20px', borderRadius: 10, border: 0, background: '#b4470a', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Reload
          </button>
          {error.digest ? <p style={{ marginTop: 12, fontSize: 12, color: '#6e5f53' }}>Reference: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
