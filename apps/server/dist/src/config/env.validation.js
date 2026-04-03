"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configModuleOptions = void 0;
exports.validateEnv = validateEnv;
const node_path_1 = require("node:path");
const zod_1 = require("zod");
const urlLike = zod_1.z.string().trim().url();
const optionalCsv = zod_1.z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length ? value : undefined));
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(['development', 'test', 'staging', 'production'])
        .default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(5000),
    DATABASE_URL: zod_1.z.string().trim().min(1),
    APP_BASE_URL: urlLike,
    APP_PUBLIC_URL: urlLike,
    CORS_ORIGINS: optionalCsv,
    CHECKOUT_ALLOWED_ORIGINS: optionalCsv,
    COOKIE_NAME_ACCESS: zod_1.z.string().trim().min(1).default('token'),
    COOKIE_NAME_REFRESH: zod_1.z.string().trim().min(1).default('refresh_token'),
    KEYCLOAK_ISSUER: urlLike,
    KEYCLOAK_JWKS_URI: urlLike,
    KEYCLOAK_CLIENT_ID: zod_1.z.string().trim().min(1),
    API_AUDIENCE: zod_1.z.string().trim().min(1),
    KEYCLOAK_AUTHORIZATION_ENDPOINT: urlLike,
    KEYCLOAK_TOKEN_ENDPOINT: urlLike,
    KEYCLOAK_LOGOUT_ENDPOINT: urlLike,
    OIDC_REDIRECT_URI: urlLike,
    OIDC_LOGOUT_ENDPOINT: zod_1.z.string().trim().url().optional(),
    OIDC_POST_LOGOUT_REDIRECT_URI: zod_1.z.string().trim().url().optional(),
    STRIPE_SECRET_KEY: zod_1.z.string().trim().min(1),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().trim().min(1),
    PUBLIC_BOOKING_SUCCESS_URL: zod_1.z.string().trim().url().optional(),
    PUBLIC_BOOKING_CANCEL_URL: zod_1.z.string().trim().url().optional(),
    NOTIFICATIONS_EMAIL_ENABLED: zod_1.z
        .enum(['true', 'false'])
        .optional()
        .default('false'),
    NOTIFY_FROM_EMAIL: zod_1.z.string().trim().email().optional(),
});
const testDefaults = {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    APP_BASE_URL: 'http://localhost:3000',
    APP_PUBLIC_URL: 'http://localhost:3000',
    KEYCLOAK_ISSUER: 'http://localhost:8080/realms/test',
    KEYCLOAK_JWKS_URI: 'http://localhost:8080/realms/test/protocol/openid-connect/certs',
    KEYCLOAK_CLIENT_ID: 'web-client',
    API_AUDIENCE: 'api-alex-tap',
    KEYCLOAK_AUTHORIZATION_ENDPOINT: 'http://localhost:8080/realms/test/protocol/openid-connect/auth',
    KEYCLOAK_TOKEN_ENDPOINT: 'http://localhost:8080/realms/test/protocol/openid-connect/token',
    KEYCLOAK_LOGOUT_ENDPOINT: 'http://localhost:8080/realms/test/protocol/openid-connect/logout',
    OIDC_REDIRECT_URI: 'http://localhost:3000/auth/callback',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_placeholder',
};
function resolveEnvFilePaths(nodeEnv = process.env.NODE_ENV) {
    const normalized = typeof nodeEnv === 'string' && nodeEnv.trim().length > 0
        ? nodeEnv.trim()
        : undefined;
    const paths = [];
    if (normalized) {
        paths.push((0, node_path_1.resolve)(process.cwd(), `.env.${normalized}.local`));
    }
    if (normalized !== 'test') {
        paths.push((0, node_path_1.resolve)(process.cwd(), '.env.local'));
    }
    if (normalized) {
        paths.push((0, node_path_1.resolve)(process.cwd(), `.env.${normalized}`));
    }
    paths.push((0, node_path_1.resolve)(process.cwd(), '.env'));
    return [...new Set(paths)];
}
function validateEnv(rawEnv) {
    const env = rawEnv.NODE_ENV === 'test' || typeof rawEnv.JEST_WORKER_ID === 'string'
        ? { ...testDefaults, ...rawEnv }
        : rawEnv;
    const parsed = envSchema.safeParse(env);
    if (!parsed.success) {
        const details = parsed.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
        throw new Error(`Invalid environment configuration:\n${details}`);
    }
    if (parsed.data.NOTIFICATIONS_EMAIL_ENABLED === 'true' &&
        !parsed.data.NOTIFY_FROM_EMAIL) {
        throw new Error('Invalid environment configuration:\nNOTIFY_FROM_EMAIL is required when NOTIFICATIONS_EMAIL_ENABLED=true');
    }
    return parsed.data;
}
exports.configModuleOptions = {
    isGlobal: true,
    envFilePath: resolveEnvFilePaths(),
    validate: validateEnv,
};
//# sourceMappingURL=env.validation.js.map