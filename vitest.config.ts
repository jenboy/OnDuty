import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // 只测纯逻辑（domain 层），不引入 jsdom
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
