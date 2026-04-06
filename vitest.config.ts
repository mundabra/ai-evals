import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@mundabra/ai-evals/ai-sdk',
        replacement: resolve(__dirname, 'src/ai-sdk.ts'),
      },
      {
        find: '@mundabra/ai-evals',
        replacement: resolve(__dirname, 'src/index.ts'),
      },
    ],
  },
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
    },
  },
});
