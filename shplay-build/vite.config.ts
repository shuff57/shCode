import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// We emit a single ES-module bundle (`shplay.js`) into shCode/public/shplay/.
// The bundle pulls in @dylanebert/shallot (and its three.js / wasm-matrix
// transitive deps) and exposes a beginner-friendly facade on `window`.
//
// Wasm assets (transforms, audio) are vendored separately by
// `scripts/vendor-wasm.mjs` so the rust toolchain isn't required for a
// standard `npm run build`.
export default defineConfig({
  build: {
    target: 'esnext',
    outDir: resolve(__dirname, '../public/shplay'),
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ['es'],
      fileName: () => 'shplay.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@dylanebert/shallot'],
  },
});
