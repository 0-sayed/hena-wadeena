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
  private readonly activeStreams = new Set<string>();
  private readonly handlers = new Map<string, StreamEventHandler>();
  private readonly retryCount = new Map<string, number>();
  private readonly maxRetries = 3;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Publish an event to a Redis Stream */
  async publish(eventName: EventName, payload: Record<string, string>): Promise<string> {
    const fields = this.encodeStreamFields(payload);
    const id = await this.redis.xadd(eventName as string, '*', ...fields);
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
      await this.redis.xgroup('CREATE', stream as string, groupName, '0', 'MKSTREAM');
    } catch (err: unknown) {
      if (!(err instanceof Error) || !err.message.includes('BUSYGROUP')) {
        throw err;
      }
    }

    const key = `${stream}:${groupName}`;
    this.handlers.set(key, handler as StreamEventHandler);

    const streamKey = `${stream}:${groupName}:${consumerName}`;
    if (!this.activeStreams.has(streamKey)) {
      this.activeStreams.add(streamKey);
      void this.startConsuming(stream as string, groupName, consumerName);
    }
  }

  private async startConsuming(stream: string, group: string, consumer: string): Promise<void> {
    const streamKey = `${stream}:${group}:${consumer}`;
    const lastPendingId = '0';
    let readingNew = false;

    while (this.activeStreams.has(streamKey)) {
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
          readingNew ? '>' : lastPendingId,
        );

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- xreadgroup with BLOCK can return null on timeout despite type definitions
        if (!results) {
          if (!readingNew) {
            readingNew = true;
          }
          continue;
        }

        for (const [streamName, messages] of results as [string, [string, string[]][]][]) {
          const key = `${streamName}:${group}`;
          const handler = this.handlers.get(key);
          if (!handler) continue;

          await Promise.all(
            messages.map(async ([msgId, fields]) => {
              const data = this.decodeStreamFields(fields);
              try {
                await handler({ stream: streamName, id: msgId, data });
                await this.redis.xack(streamName, group, msgId);
                this.retryCount.delete(msgId);
              } catch (err) {
                const retries = (this.retryCount.get(msgId) ?? 0) + 1;
                this.retryCount.set(msgId, retries);
                this.logger.error(
                  `Handler error for ${streamName}:${msgId} (attempt ${retries}/${this.maxRetries})`,
                  err,
                );
                if (retries >= this.maxRetries) {
                  const dlqStream = `${streamName}:dlq`;
                  const errorMessage = err instanceof Error ? err.message : String(err);
                  await this.redis.xadd(
                    dlqStream,
                    '*',
                    ...this.encodeStreamFields({
                      ...data,
                      _originalId: msgId,
                      _originalStream: streamName,
                      _error: errorMessage,
                      _failedAt: new Date().toISOString(),
                    }),
                  );
                  await this.redis.xack(streamName, group, msgId);
                  this.retryCount.delete(msgId);
                  this.logger.error(
                    `Message ${msgId} moved to DLQ ${dlqStream} after ${this.maxRetries} failed attempts`,
                  );
                }
              }
            }),
          );
        }
      } catch (err) {
        if (this.activeStreams.has(streamKey)) {
          this.logger.error('Stream consumer error', err);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }

  private encodeStreamFields(obj: Record<string, string>): string[] {
    return Object.entries(obj).flat();
  }

  private decodeStreamFields(fields: string[]): Record<string, string> {
    const data: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      const key = fields[i];
      const value = fields[i + 1];
      if (key !== undefined) {
        data[key] = value ?? '';
      }
    }
    return data;
  }

  onModuleDestroy() {
    this.activeStreams.clear();
    this.handlers.clear();
    this.retryCount.clear();
  }
}
