import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/types',
  'packages/nest-common',
  'services/identity',
  'services/market',
  'services/guide-booking',
  'services/map',
]);
