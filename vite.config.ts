import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

/**
 * The web app is configured only through backend/.env, the project's single env file.
 * Only variables prefixed VITE_ are exposed to the browser; backend secrets never are.
 *   VITE_API_BASE_URL  where the API lives (required)
 *   VITE_DEV_PORT      port for `npm run dev` / `npm run preview` (required for those commands)
 */
export default defineConfig(({ mode, command }) => {
  const envDir = path.resolve(__dirname, 'backend');
  const env = loadEnv(mode, envDir, 'VITE_');
  const need = (name: string) => {
    const v = env[name];
    if (!v) throw new Error(`${name} is not set in backend/.env`);
    return v;
  };
  const serving = command === 'serve' || process.argv.includes('preview');
  const port = serving ? Number(need('VITE_DEV_PORT')) : undefined;
  if (serving && !Number.isInteger(port)) throw new Error('VITE_DEV_PORT must be a whole number');
  need('VITE_API_BASE_URL');
  return {
    envDir,
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    server: { port, strictPort: true },
    preview: { port, strictPort: true },
  };
});
