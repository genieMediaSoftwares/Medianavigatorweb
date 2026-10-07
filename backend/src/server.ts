import express from 'express';
import path from 'path';
import { env } from './config/env.js';
import { app } from './app.js';

// Vite (dev) & static (prod) serving setup, then listen
async function startServer() {
  if (!env.isProduction && !env.isVercel) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite middleware initialization skipped or failed:', e);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Media Navigator server running on http://0.0.0.0:${env.port}`);
  });
}

if (!env.isVercel) {
  startServer();
}
