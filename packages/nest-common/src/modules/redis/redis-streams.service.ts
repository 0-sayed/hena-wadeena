import { EventName } from '@hena-wadeena/types';
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.module';

export interface StreamMessage<T = Record<string, unknown>> {
  stream: string;
  id: string;
  data: T;
}

export type StreamEventHandler<T = Record<string, unknown>> = (
  message: StreamMessage<T>,
) => Promise<void>;

@Injectable()
export class RedisStreamsService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisStreamsService.name);
  private isRunning = false;
  private readonly handlers = new Map<string, StreamEventHandler>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Publish an event to a Redis Stream */
  async publish<T extends Record<string, string>>(
    eventName: EventName,
    payload: T,
  ): Promise<string> {
    const fields = this.encodeStreamFields(payload);
    const id = await this.redis.xadd(eventName, '*', ...fields);
    if (!id) throw new Error(`Failed to publish to stream: ${eventName}`);
    this.logger.debug(`Published ${eventName}: ${id}`);
    return id;
  }

  /** Register a consumer group + handler for a stream */
  async subscribe<T extends Record<string, unknown>>(
    stream: EventName,
    groupName: string,
    consumerName: string,
    handler: StreamEventHandler<T>,
  ): Promise<void> {
    // Create consumer group if it doesn't exist
    try {
      await this.redis.xgroup('CREATE', stream, groupName, '0', 'MKSTREAM');
    } catch (err: unknown) {
      const error = err as { message?: string };
      if (!error.message?.includes('BUSYGROUP')) {
        throw err;
      }
    }

    const key = `${stream}:${groupName}`;
    this.handlers.set(key, handler as StreamEventHandler);

    if (!this.isRunning) {
      this.isRunning = true;
      void this.startConsuming(stream, groupName, consumerName);
    }
  }

  private async startConsuming(stream: string, group: string, consumer: string): Promise<void> {
    while (this.isRunning) {
      try {
        const results = await this.redis.xreadgroup(
          'GROUP',
          group,
          consumer,
          'COUNT',
          10,
          'BLOCK',
          2000,
          'STREAMS',
          stream,
          '>',
        );

        if (!results) continue;

        for (const [streamName, messages] of results as [string, [string, string[]][]][]) {
          const key = `${streamName}:${group}`;
          const handler = this.handlers.get(key);
          if (!handler) continue;

          await Promise.all(
            messages.map(async ([msgId, fields]) => {
              const data = this.decodeStreamFields(fields);
              try {
                await handler({ stream: streamName, id: msgId, data: data as never });
                await this.redis.xack(streamName, group, msgId);
              } catch (err) {
                this.logger.error(`Handler error for ${streamName}:${msgId}`, err);
              }
            }),
          );
        }
      } catch (err) {
        if (this.isRunning) {
          this.logger.error('Stream consumer error', err);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }

  private encodeStreamFields<T extends Record<string, string>>(obj: T): string[] {
    return Object.entries(obj).flat();
  }

  private decodeStreamFields(fields: string[]): Record<string, string> {
    const data: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }
    return data;
  }

  onModuleDestroy() {
    this.isRunning = false;
    this.handlers.clear();
  }
}
