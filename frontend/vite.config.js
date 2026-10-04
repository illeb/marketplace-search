import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The Node backend serves ../public as its static root, so the build writes
// straight into it. base:'./' keeps every asset URL relative, which is what the
// backend's static handler expects (it strips the leading slash and reads the
// path verbatim out of public/).
export default defineConfig({
  plugins: [svelte()],
  base: './',
  build: {
    outDir: '../public',
    emptyOutDir: true,
    assetsDir: 'assets',
    target: 'es2022',
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // `npm run dev` serves the UI from Vite and borrows the real API.
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
});
