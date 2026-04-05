import path from 'path';

import { config as dotenvConfig } from 'dotenv';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Load .env for E2E tests so ConfigModule can validate env vars
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

if (!process.env['SERVICE_NAME']) {
  process.env['SERVICE_NAME'] = 'guide-booking';
}

// Override DB_SCHEMA to include 'public' for PostGIS type resolution (geography, geometry).
// Must be set before AppModule is imported so the @Module decorator captures the correct search_path.
// The `.env` above sets DB_SCHEMA=guide_booking, so we unconditionally append `public` here
// (matching the market/map E2E configs) — a conditional guard would silently drop PostGIS resolution.
process.env['DB_SCHEMA'] = 'guide_booking, public';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // E2E tests share a single Redis instance — run files sequentially to
    // prevent cross-file cache interference (one flushdb clearing another's state)
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
