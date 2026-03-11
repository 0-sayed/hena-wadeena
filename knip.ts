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
    },
    'services/identity': {
      entry: ['src/main.ts'],
      project: ['src/**/*.ts'],
    },
    'services/market': {
      entry: ['src/main.ts'],
      project: ['src/**/*.ts'],
    },
    'services/guide-booking': {
      entry: ['src/main.ts'],
      project: ['src/**/*.ts'],
    },
    'services/map': {
      entry: ['src/main.ts'],
      project: ['src/**/*.ts'],
    },
  },
  ignoreWorkspaces: ['apps/web'],
  ignore: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
  ignoreDependencies: ['typescript'],
};

export default config;
