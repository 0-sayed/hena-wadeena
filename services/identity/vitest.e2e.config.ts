import path from 'path';

import { config as dotenvConfig } from 'dotenv';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Load .env for E2E tests so ConfigModule can validate env vars
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
  plugins: [
    // SWC transforms TypeScript with emitDecoratorMetadata — required for NestJS DI in E2E tests
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2021',
      },
    }),
  ],
  resolve: {
    alias: {
      '@hena-wadeena/types': path.resolve(__dirname, '../../packages/types/src'),
      '@hena-wadeena/nest-common': path.resolve(__dirname, '../../packages/nest-common/src'),
    },
  },
});
