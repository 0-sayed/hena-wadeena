import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@hena-wadeena/types': path.resolve(__dirname, '../../packages/types/src'),
      '@hena-wadeena/nest-common': path.resolve(__dirname, '../../packages/nest-common/src'),
    },
  },
});
