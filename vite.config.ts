import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';

/** In development the API runs from backend/ — read its port from backend/.env (the only env file) so no frontend env is needed. */
function localApiTarget(): string | undefined {
  try {
    const m = fs.readFileSync(path.resolve(__dirname, 'backend/.env'), 'utf8').match(/^\s*SERVER_PORT\s*=\s*(\d+)\s*$/m);
    return m ? `http://localhost:${m[1]}` : undefined;
  } catch { return undefined; }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    server: {
      // Forward /api to the local backend (VITE_DEV_API_PROXY overrides the target).
      proxy: (() => { const target = env.VITE_DEV_API_PROXY || localApiTarget(); return target ? { '/api': { target, changeOrigin: true } } : undefined; })(),
    },
  };
});
