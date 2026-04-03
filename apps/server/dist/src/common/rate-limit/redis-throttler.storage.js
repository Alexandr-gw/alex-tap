"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisThrottlerStorage = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_config_1 = require("../../notifications/queue/redis.config");
let RedisThrottlerStorage = class RedisThrottlerStorage {
    client;
    constructor(env = process.env) {
        this.client = new ioredis_1.default((0, redis_config_1.getRedisConnection)(env));
    }
    async increment(key, ttl, limit, blockDuration, throttlerName) {
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
        }
        catch {
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
};
exports.RedisThrottlerStorage = RedisThrottlerStorage;
exports.RedisThrottlerStorage = RedisThrottlerStorage = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], RedisThrottlerStorage);
//# sourceMappingURL=redis-throttler.storage.js.map