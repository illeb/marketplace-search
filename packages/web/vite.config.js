import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import stylex from '@stylexjs/rollup-plugin';

// Builds to packages/web/dist. The api package serves that directory as its
// static root; see WEB_ROOT in packages/api/src/hunter/config.mjs. base:'./'
// keeps every asset URL relative, which is what the api's static handler
// expects.
//
// The StyleX plugin runs `post`, after vite-plugin-svelte has compiled each
// component to plain JavaScript, so the `stylex.create` calls in `<script
// module>` blocks are visible to it. It writes the collected rules to
// dist/stylex.css as a standalone asset; Vite does not inject a <link> for it,
// so index.html carries one by hand.
export default defineConfig({
  plugins: [svelte(), { ...stylex({ useCSSLayers: false }), enforce: 'post' }],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, assetsDir: 'assets', target: 'es2022' },
  server: {
    port: 5173,
    strictPort: false,
    // `pnpm dev` serves the UI from Vite and borrows the real API.
    proxy: { '/graphql': { target: 'http://localhost:8080', changeOrigin: true } },
  },
});
