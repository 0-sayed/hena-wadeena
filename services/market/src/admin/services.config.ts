import { resolveLocalServiceUrl } from '@hena-wadeena/types';

export interface AdminServiceConfig {
  name: string;
  url: string;
  statsPath: string;
  moderationPath: string | null;
}

export const ADMIN_SERVICES: AdminServiceConfig[] = [
  {
    name: 'identity',
    url: resolveLocalServiceUrl({
      defaultPort: 8001,
      explicitPort: process.env.IDENTITY_PORT,
      explicitUrl: process.env.IDENTITY_SERVICE_URL,
      env: process.env,
    }),
    statsPath: '/api/v1/internal/stats',
    moderationPath: '/api/v1/internal/moderation',
  },
  {
    name: 'guide-booking',
    url: resolveLocalServiceUrl({
      defaultPort: 8003,
      explicitPort: process.env.GUIDE_BOOKING_PORT,
      explicitUrl: process.env.GUIDE_BOOKING_SERVICE_URL,
      env: process.env,
    }),
    statsPath: '/api/v1/internal/stats',
    moderationPath: null,
  },
  {
    name: 'map',
    url: resolveLocalServiceUrl({
      defaultPort: 8004,
      explicitPort: process.env.MAP_PORT,
      explicitUrl: process.env.MAP_SERVICE_URL,
      env: process.env,
    }),
    statsPath: '/api/v1/internal/stats',
    moderationPath: '/api/v1/internal/moderation',
  },
];

export const ADMIN_STATS_CACHE_KEY = 'admin:stats';
export const ADMIN_STATS_CACHE_TTL = 60; // seconds
export const SERVICE_TIMEOUT_MS = 3000;
