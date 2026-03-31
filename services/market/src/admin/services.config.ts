export interface AdminServiceConfig {
  name: string;
  url: string;
  statsPath: string;
  moderationPath: string | null;
}

export const ADMIN_SERVICES: AdminServiceConfig[] = [
  {
    name: 'identity',
    url: process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:8001',
    statsPath: '/api/v1/internal/stats',
    moderationPath: '/api/v1/internal/moderation',
  },
  {
    name: 'guide-booking',
    url: process.env.GUIDE_BOOKING_SERVICE_URL ?? 'http://localhost:8003',
    statsPath: '/api/v1/internal/stats',
    moderationPath: null,
  },
  {
    name: 'map',
    url: process.env.MAP_SERVICE_URL ?? 'http://localhost:8004',
    statsPath: '/api/v1/internal/stats',
    moderationPath: '/api/v1/internal/moderation',
  },
];

export const ADMIN_STATS_CACHE_KEY = 'admin:stats';
export const ADMIN_STATS_CACHE_TTL = 60; // seconds
export const SERVICE_TIMEOUT_MS = 3000;
