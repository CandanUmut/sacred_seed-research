import path from 'node:path';
import { defineConfig } from 'vite';

const sharedSrc = path.resolve(__dirname, '../shared/src');

export default defineConfig({
  resolve: {
    alias: {
      '@sperm-odyssey/shared': sharedSrc,
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:8787',
        ws: true,
      },
    },
  },
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    alias: {
      '@sperm-odyssey/shared': sharedSrc,
    },
  },
});
