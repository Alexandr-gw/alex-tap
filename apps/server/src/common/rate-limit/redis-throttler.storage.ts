import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';
import { getRedisConnection } from '@/notifications/queue/redis.config';

type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly client: Redis;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.client = new Redis(getRedisConnection(env) as Record<string, unknown>);
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttle:${throttlerName}:hits:${key}`;
    const blockKey = `throttle:${throttlerName}:block:${key}`;

    try {
      const blockTtl = await this.client.pttl(blockKey);
      const hitsTtlBefore = await this.client.pttl(hitsKey);

      if (blockTtl > 0) {
        const existingHits = Number((await this.client.get(hitsKey)) ?? limit + 1);

        return {
          totalHits: existingHits,
          timeToExpire: Math.max(1, Math.ceil((hitsTtlBefore > 0 ? hitsTtlBefore : ttl) / 1000)),
          isBlocked: true,
          timeToBlockExpire: Math.max(1, Math.ceil(blockTtl / 1000)),
        };
      }

      const totalHits = await this.client.incr(hitsKey);

      if (totalHits === 1 || hitsTtlBefore < 0) {
        await this.client.pexpire(hitsKey, ttl);
      }

      const hitsTtlAfter = await this.client.pttl(hitsKey);

      if (totalHits > limit) {
        await this.client.set(blockKey, '1', 'PX', blockDuration);
        const nextBlockTtl = await this.client.pttl(blockKey);

        return {
          totalHits,
          timeToExpire: Math.max(1, Math.ceil((hitsTtlAfter > 0 ? hitsTtlAfter : ttl) / 1000)),
          isBlocked: true,
          timeToBlockExpire: Math.max(1, Math.ceil((nextBlockTtl > 0 ? nextBlockTtl : blockDuration) / 1000)),
        };
      }

      return {
        totalHits,
        timeToExpire: Math.max(1, Math.ceil((hitsTtlAfter > 0 ? hitsTtlAfter : ttl) / 1000)),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch {
      // Fail open if Redis is temporarily unavailable so rate limiting
      // does not take the API down.
      return {
        totalHits: 1,
        timeToExpire: Math.max(1, Math.ceil(ttl / 1000)),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }

  async onApplicationShutdown() {
    await this.client.quit().catch(() => undefined);
  }
}
