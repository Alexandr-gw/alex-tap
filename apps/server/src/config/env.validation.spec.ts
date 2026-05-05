import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const baseEnv = {
    NODE_ENV: 'production',
    PORT: '5000',
    DATABASE_URL: 'postgresql://app:secret@db:5432/alex_tap',
    APP_BASE_URL: 'https://alex-tap.example.com',
    APP_PUBLIC_URL: 'https://alex-tap.example.com',
    KEYCLOAK_ISSUER: 'https://auth.example.com/realms/alex-tap',
    KEYCLOAK_JWKS_URI:
      'https://auth.example.com/realms/alex-tap/protocol/openid-connect/certs',
    KEYCLOAK_CLIENT_ID: 'web-app',
    API_AUDIENCE: 'api',
    KEYCLOAK_TOKEN_ENDPOINT:
      'https://auth.example.com/realms/alex-tap/protocol/openid-connect/token',
    KEYCLOAK_LOGOUT_ENDPOINT:
      'https://auth.example.com/realms/alex-tap/protocol/openid-connect/logout',
    OIDC_REDIRECT_URI: 'https://api.example.com/auth/callback',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
  };

  it('allows the Keycloak authorization endpoint to be derived from issuer', () => {
    expect(validateEnv(baseEnv).KEYCLOAK_AUTHORIZATION_ENDPOINT).toBeUndefined();
  });
});
