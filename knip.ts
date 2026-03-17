import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: [],
      project: [],
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
      entry: ['src/main.ts', 'src/db/migrate.ts'],
      project: ['src/**/*.ts'],
      // drizzle-zod: planned for DTO generation once schemas stabilise
      ignoreDependencies: ['drizzle-zod'],
    },
    'services/market': {
      entry: ['src/main.ts', 'src/db/migrate.ts'],
      project: ['src/**/*.ts'],
    },
    'services/guide-booking': {
      entry: ['src/main.ts', 'src/db/migrate.ts'],
      project: ['src/**/*.ts'],
      // @hena-wadeena/types will be used as guide-booking features are built out
      ignoreDependencies: ['@hena-wadeena/types', '@nestjs/testing'],
    },
    'services/map': {
      entry: ['src/main.ts', 'src/db/migrate.ts'],
      project: ['src/**/*.ts'],
      // @hena-wadeena/types will be used as map features are built out
      ignoreDependencies: ['@hena-wadeena/types', '@nestjs/testing'],
    },
  },
  ignoreWorkspaces: ['apps/web'],
  ignore: ['apps/web/**'],
  // Enum members in packages/types are forward-looking public API for services not yet implemented
  exclude: ['enumMembers'],
};

export default config;
