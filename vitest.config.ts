import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/ai/**'],
      // Барrel-файлы — чистые реэкспорты, worker.ts — entry-point воркера
      // (его работа проверяется сборкой и протокольными типами, не юнит-раннером)
      exclude: ['src/ai/**/index.ts', 'src/ai/engine/worker.ts'],
      thresholds: { lines: 85, functions: 85, branches: 75, statements: 85 },
    },
  },
});
