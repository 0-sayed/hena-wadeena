/** Redis key prefix per service — ensures key-space isolation on shared Redis */
export const REDIS_PREFIX = {
  IDENTITY: 'id:',
  MARKET: 'mkt:',
  GUIDE_BOOKING: 'gb:',
  MAP: 'map:',
  AI: 'ai:',
  GATEWAY: 'gw:',
} as const;

export type RedisPrefix = (typeof REDIS_PREFIX)[keyof typeof REDIS_PREFIX];
