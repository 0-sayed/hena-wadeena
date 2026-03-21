import Redis from 'ioredis';

/** SCAN-based key deletion. Use for wildcard cache invalidation. */
export async function scanAndDelete(redis: Redis, pattern: string): Promise<void> {
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = parseInt(nextCursor, 10);
    if (keys.length > 0) {
      await Promise.all(keys.map((k) => redis.del(k)));
    }
  } while (cursor !== 0);
}
