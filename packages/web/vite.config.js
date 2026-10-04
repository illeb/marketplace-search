import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Builds to packages/web/dist. The api package serves that directory as its
// static root; see WEB_ROOT in packages/api/src/config.mjs. base:'./' keeps
// every asset URL relative, which is what the api's static handler expects.
export default defineConfig({
  plugins: [svelte()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, assetsDir: 'assets', target: 'es2022' },
  server: {
    port: 5173,
    strictPort: false,
    // `pnpm dev` serves the UI from Vite and borrows the real API.
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
});
