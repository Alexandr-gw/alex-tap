"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisConnection = getRedisConnection;
function getRedisConnection(env = process.env) {
    const redisUrl = env.REDIS_URL?.trim();
    if (redisUrl) {
        const url = new URL(redisUrl);
        return {
            host: url.hostname,
            port: url.port ? Number(url.port) : 6379,
            username: url.username || undefined,
            password: url.password || undefined,
            db: url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : undefined,
            tls: url.protocol === 'rediss:' ? {} : undefined,
            maxRetriesPerRequest: null,
        };
    }
    return {
        host: env.REDIS_HOST ?? 'localhost',
        port: Number(env.REDIS_PORT ?? 6379),
        password: env.REDIS_PASSWORD || undefined,
        db: env.REDIS_DB ? Number(env.REDIS_DB) : undefined,
        maxRetriesPerRequest: null,
    };
}
//# sourceMappingURL=redis.config.js.map