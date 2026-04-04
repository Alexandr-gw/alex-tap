# Keycloak Docker Image

This image gives you a reproducible Keycloak build that already contains:

- the Alex Tap custom theme JAR from `apps/keycloak-theme`
- the generated realm import JSON from `apps/server/keycloak/generated`
- a startup wrapper that selects the right realm import for `local`, `staging`, or `production`

## Build Inputs

The Docker build:

1. runs `npm -w apps/server run keycloak:generate-realms`
2. runs `npm -w apps/keycloak-theme run build-keycloak-theme`
3. copies the built theme JAR into the official Keycloak image
4. bakes in the generated realm JSON files

The image is pinned to Keycloak `26.3.2`, which matches the local `docker-compose.yml` service.

## Runtime Selection

At container startup, `apps/keycloak/bin/start-keycloak.sh` selects the realm import based on:

- `KEYCLOAK_IMPORT_ENV`, if set
- otherwise `APP_ENV`

Supported values:

- `local`
- `staging`
- `production` or `prod`

## Recommended Runtime Env

For each Keycloak container or Compose service, set these values in your VPS env file or secret manager:

- `APP_ENV=staging` or `APP_ENV=production`
- `KEYCLOAK_IMPORT_ENV=staging` or `KEYCLOAK_IMPORT_ENV=production`
- `KC_BOOTSTRAP_ADMIN_USERNAME`
- `KC_BOOTSTRAP_ADMIN_PASSWORD`
- `KC_DB=postgres`
- `KC_DB_URL`
- `KC_DB_USERNAME`
- `KC_DB_PASSWORD`
- `KC_HOSTNAME`

The image already defaults these runtime options:

- `KC_HEALTH_ENABLED=true`
- `KC_METRICS_ENABLED=true`
- `KC_PROXY_HEADERS=xforwarded`
- `KC_HTTP_ENABLED=true`

## Start Command

No custom start command is required. The container entrypoint will run:

```sh
/opt/keycloak/bin/kc.sh start --optimized --import-realm
```

unless you explicitly override the command in Docker Compose or your container runtime.
