import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@middlewares': path.resolve(__dirname, 'src/middlewares'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
