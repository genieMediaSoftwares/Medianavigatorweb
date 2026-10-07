import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    server: {
      // Optional: set VITE_DEV_API_PROXY in your own .env to forward /api to a locally running backend during development.
      proxy: env.VITE_DEV_API_PROXY ? { '/api': { target: env.VITE_DEV_API_PROXY, changeOrigin: true } } : undefined,
    },
  };
});
