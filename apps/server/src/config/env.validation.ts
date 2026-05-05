import { resolve } from 'node:path';
import { z } from 'zod';

const urlLike = z.string().trim().url();

const optionalCsv = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length ? value : undefined));

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().trim().min(1),

  APP_BASE_URL: urlLike,
  APP_PUBLIC_URL: urlLike,
  CORS_ORIGINS: optionalCsv,
  CHECKOUT_ALLOWED_ORIGINS: optionalCsv,

  COOKIE_NAME_ACCESS: z.string().trim().min(1).default('token'),
  COOKIE_NAME_REFRESH: z.string().trim().min(1).default('refresh_token'),

  KEYCLOAK_ISSUER: urlLike,
  KEYCLOAK_JWKS_URI: urlLike,
  KEYCLOAK_CLIENT_ID: z.string().trim().min(1),
  API_AUDIENCE: z.string().trim().min(1),
  KEYCLOAK_AUTHORIZATION_ENDPOINT: urlLike.optional(),
  KEYCLOAK_TOKEN_ENDPOINT: urlLike,
  KEYCLOAK_LOGOUT_ENDPOINT: urlLike,
  OIDC_REDIRECT_URI: urlLike,
  OIDC_LOGOUT_ENDPOINT: z.string().trim().url().optional(),
  OIDC_POST_LOGOUT_REDIRECT_URI: z.string().trim().url().optional(),

  STRIPE_SECRET_KEY: z.string().trim().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().trim().min(1),

  PUBLIC_BOOKING_SUCCESS_URL: z.string().trim().url().optional(),
  PUBLIC_BOOKING_CANCEL_URL: z.string().trim().url().optional(),

  NOTIFICATIONS_EMAIL_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
  NOTIFY_FROM_EMAIL: z.string().trim().email().optional(),
});

const testDefaults = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  APP_BASE_URL: 'http://localhost:3000',
  APP_PUBLIC_URL: 'http://localhost:3000',
  KEYCLOAK_ISSUER: 'http://localhost:8080/realms/test',
  KEYCLOAK_JWKS_URI:
    'http://localhost:8080/realms/test/protocol/openid-connect/certs',
  KEYCLOAK_CLIENT_ID: 'web-client',
  API_AUDIENCE: 'api-alex-tap',
  KEYCLOAK_AUTHORIZATION_ENDPOINT:
    'http://localhost:8080/realms/test/protocol/openid-connect/auth',
  KEYCLOAK_TOKEN_ENDPOINT:
    'http://localhost:8080/realms/test/protocol/openid-connect/token',
  KEYCLOAK_LOGOUT_ENDPOINT:
    'http://localhost:8080/realms/test/protocol/openid-connect/logout',
  OIDC_REDIRECT_URI: 'http://localhost:3000/auth/callback',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_placeholder',
} as const;

function resolveEnvFilePaths(nodeEnv = process.env.NODE_ENV) {
  const normalized = typeof nodeEnv === 'string' && nodeEnv.trim().length > 0
    ? nodeEnv.trim()
    : undefined;

  const paths: string[] = [];

  if (normalized) {
    paths.push(resolve(process.cwd(), `.env.${normalized}.local`));
  }

  if (normalized !== 'test') {
    paths.push(resolve(process.cwd(), '.env.local'));
  }

  if (normalized) {
    paths.push(resolve(process.cwd(), `.env.${normalized}`));
  }

  paths.push(resolve(process.cwd(), '.env'));

  return [...new Set(paths)];
}

export function validateEnv(
  rawEnv: Record<string, unknown>,
): Record<string, unknown> {
  const env =
    rawEnv.NODE_ENV === 'test' || typeof rawEnv.JEST_WORKER_ID === 'string'
      ? { ...testDefaults, ...rawEnv }
      : rawEnv;

  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  if (
    parsed.data.NOTIFICATIONS_EMAIL_ENABLED === 'true' &&
    !parsed.data.NOTIFY_FROM_EMAIL
  ) {
    throw new Error(
      'Invalid environment configuration:\nNOTIFY_FROM_EMAIL is required when NOTIFICATIONS_EMAIL_ENABLED=true',
    );
  }

  return parsed.data;
}

export const configModuleOptions = {
  isGlobal: true,
  envFilePath: resolveEnvFilePaths(),
  validate: validateEnv,
} as const;
