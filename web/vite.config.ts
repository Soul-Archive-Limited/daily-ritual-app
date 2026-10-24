import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The website reuses the app's own logic (scoring, streaks, progress, shelf) from ../src.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@/theme/tokens', replacement: fileURLToPath(new URL('./src/shims/tokens.ts', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('../src', import.meta.url)) },
    ],
  },
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    // During `npm run dev`, API calls go to a local `wrangler dev` (http://localhost:8787).
    proxy: Object.fromEntries(
      ['/auth', '/sync', '/me', '/geo', '/signout', '/account', '/health'].map((p) => [p, 'http://localhost:8787']),
    ),
  },
});
