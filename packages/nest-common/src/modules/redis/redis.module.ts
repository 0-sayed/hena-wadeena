import { DynamicModule, Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export interface RedisModuleOptions {
  url: string;
  password?: string;
  keyPrefix: string;
}

@Global()
@Module({})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  static forRoot(options: RedisModuleOptions): DynamicModule {
    const redisProvider = {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const client = new Redis(options.url, {
          password: options.password?.trim() ? options.password : undefined,
          keyPrefix: options.keyPrefix,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        });

        client.on('error', (err: Error) => {
          console.error('[Redis] Connection error:', err.message);
        });

        return client;
      },
    };

    return {
      module: RedisModule,
      providers: [redisProvider],
      exports: [REDIS_CLIENT],
    };
  }
}
