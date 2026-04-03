import { OnApplicationShutdown } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
type ThrottlerStorageRecord = {
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
};
export declare class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
    private readonly client;
    constructor(env?: NodeJS.ProcessEnv);
    increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<ThrottlerStorageRecord>;
    onApplicationShutdown(): Promise<void>;
}
export {};
