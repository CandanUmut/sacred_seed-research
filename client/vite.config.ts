import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
  },
  resolve: {
    alias: {
      '@sperm-odyssey/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});
