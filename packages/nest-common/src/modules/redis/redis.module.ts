import { DynamicModule, Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import { RedisStreamsService } from './redis-streams.service';
import { REDIS_CLIENT, REDIS_STREAMS_CLIENT } from './redis.tokens';

export { REDIS_CLIENT, REDIS_STREAMS_CLIENT };

export interface RedisModuleOptions {
  url: string;
  password?: string;
  keyPrefix: string;
}

@Global()
@Module({})
export class RedisModule implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_STREAMS_CLIENT) private readonly redisStreams: Redis,
  ) {}

  async onModuleDestroy() {
    await Promise.all([this.redis.quit(), this.redisStreams.quit()]);
  }

  static forRoot(options: RedisModuleOptions): DynamicModule {
    const createClient = (label: string, keyPrefix?: string) => {
      const client = new Redis(options.url, {
        password: options.password?.trim() ? options.password : undefined,
        keyPrefix,
        lazyConnect: false,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });
      client.on('error', (err: Error) => {
        console.error(`[${label}] Connection error:`, err.message);
      });
      return client;
    };

    const redisProvider = {
      provide: REDIS_CLIENT,
      useFactory: () => createClient('Redis', options.keyPrefix),
    };

    const streamsProvider = {
      provide: REDIS_STREAMS_CLIENT,
      useFactory: () => createClient('Redis Streams'),
    };

    return {
      module: RedisModule,
      providers: [redisProvider, streamsProvider, RedisStreamsService],
      exports: [REDIS_CLIENT, REDIS_STREAMS_CLIENT, RedisStreamsService],
    };
  }
}
