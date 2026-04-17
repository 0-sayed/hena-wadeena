import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['scripts/db-reset.ts', 'scripts/seed/seed-utils.ts', 'scripts/seed/shared-ids.ts'],
      project: ['scripts/**/*.ts'],
    },
    'packages/types': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/nest-common': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
      // pino-pretty is a runtime transport for nestjs-pino, not a direct TS import
      ignoreDependencies: ['pino-pretty'],
    },
    'services/identity': {
      entry: ['src/main.ts', 'src/db/migrate.ts', 'src/db/seed.ts', 'test/e2e-helpers.ts'],
      project: ['src/**/*.ts', 'test/**/*.ts'],
      // drizzle-zod: planned for DTO generation once schemas stabilise
      ignoreDependencies: ['drizzle-zod'],
    },
    'services/market': {
      entry: ['src/main.ts', 'src/db/migrate.ts', 'src/db/seed.ts', 'test/e2e-helpers.ts'],
      project: ['src/**/*.ts', 'test/**/*.ts'],
    },
    'services/guide-booking': {
      entry: ['src/main.ts', 'src/db/migrate.ts', 'src/db/seed.ts', 'test/e2e-helpers.ts'],
      project: ['src/**/*.ts', 'test/**/*.ts'],
      // drizzle-zod: planned for DTO generation
      ignoreDependencies: ['drizzle-zod'],
    },
    'services/map': {
      entry: ['src/main.ts', 'src/db/migrate.ts', 'src/db/seed.ts', 'test/e2e-helpers.ts'],
      project: ['src/**/*.ts', 'test/**/*.ts'],
    },
  },
  ignoreWorkspaces: ['apps/web'],
  // Temporarily disabled modules and web app
  ignore: [
    'apps/web/**',
    // Legacy jobs controller/module are kept for reference while the split job-posts/job-applications stack owns runtime traffic.
    'services/market/src/jobs/jobs.controller.ts',
    'services/market/src/jobs/jobs.module.ts',
  ],
  // Enum members in packages/types are forward-looking public API for services not yet implemented
  exclude: ['enumMembers'],
  // LinkedCommodity etc. are exported for TS return-type inference (knip can't detect this)
  ignoreExportsUsedInFile: true,
};

export default config;
