# Keycloak setup

This folder keeps the Keycloak realm setup aligned with the server auth flow.

## What gets generated

Run:

```bash
npm run keycloak:generate-realms
```

That writes three realm import files:

- `generated/local/alex-tap-local-realm.json`
- `generated/staging/alex-tap-staging-realm.json`
- `generated/prod/alex-tap-prod-realm.json`

Only the `local` realm contains seeded demo users and passwords. Staging and prod are intentionally generated without default users.

## Local users

These users are mirrored by `prisma/seed.ts` so role checks and memberships work in the app:

- `admin@gmail.com` / `admin`
- `manager@gmail.com` / `manager`
- `worker@gmail.com` / `worker`
- `worker.one@gmail.com` / `worker`
- `worker.two@gmail.com` / `worker`
- `worker.three@gmail.com` / `worker`
- `client@gmail.com` / `client`

## Local realm behavior

- Realm: `alex-tap-local`
- Login theme: `keycloak-theme`
- Self-registration: disabled
- Reset password: enabled
- Login with email: enabled
- PKCE public client: `web-app`
- API audience: `api`

The local Docker compose mounts `generated/local` into Keycloak's import directory and mounts the theme build output from `apps/keycloak-theme/dist_keycloak`.

## Social login

Google and GitHub can be enabled from the generated realm import without using the admin panel, but they still need real OAuth app credentials from Google Cloud and GitHub.

Local env vars:

- `KEYCLOAK_LOCAL_GOOGLE_CLIENT_ID`
- `KEYCLOAK_LOCAL_GOOGLE_CLIENT_SECRET`
- `KEYCLOAK_LOCAL_GITHUB_CLIENT_ID`
- `KEYCLOAK_LOCAL_GITHUB_CLIENT_SECRET`

After setting them, run:

```bash
npm run keycloak:generate-realms
docker compose up -d --force-recreate keycloak
```

Provider callback URLs for local development:

- Google: `http://127.0.0.1:8080/realms/alex-tap-local/broker/google/endpoint`
- GitHub: `http://127.0.0.1:8080/realms/alex-tap-local/broker/github/endpoint`

The generated realm import automatically grants the Keycloak `manager` realm role to users who first arrive through Google or GitHub. The app also auto-creates a `MANAGER` membership in the local demo company on first `/me` load so those users can actually use manager flows right away.

If a local broker flow sends a verification or linking email, it is delivered to Mailhog, not to the real inbox. Open Mailhog and check the local captured mail there.

## Public demo mode

The local setup is configured for a public demo flow:

- `PUBLIC_DEMO_AUTO_PROVISION=true`
- `PUBLIC_DEMO_COMPANY_ID=demo-company`

When a new Google or GitHub user signs in and has the `manager` realm role from the IdP mapper, the app automatically provisions a `MANAGER` membership in the demo company. Invalid client-selected company ids are ignored and the app falls back to the valid demo membership instead of failing the login flow.

## Nightly reset

To restore the demo workspace back to the seeded baseline, run:

```bash
npm run demo:reset
```

This resets the app database and reseeds the shared demo data. It is a good candidate for a nightly scheduled task.
