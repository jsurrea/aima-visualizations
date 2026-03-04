import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/algorithms/**'],
      thresholds: {
        branches: 100,
        lines: 100,
      },
    },
  },
});
