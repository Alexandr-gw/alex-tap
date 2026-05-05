# k6 Performance Tests

This folder contains a `k6` harness for the Alex Tap app.

## Scenarios

- `public-read.js`: anonymous public booking reads
- `dashboard-read.js`: authenticated staff reads for `/me`, workers, jobs, and alerts
- `prod-conservative-read.js`: conservative production read profile covering health, auth, jobs, services, workers, worker slots, and public slots
- `site-smoke.js`: frontend smoke coverage for the deployed app routes
- `write-light.js`: low-volume task create/delete cycle for safe write-path validation
- `jobs-clients-crud.js`: authenticated client/job create-read-update coverage plus worker slot reads and job cancel/reopen checks

The structure follows Grafana's current API CRUD guidance: do setup once, reuse auth state, and keep each scenario focused on a clear request flow. The suite intentionally avoids browser automation and does not treat real Stripe checkout as a throughput scenario. Public checkout calls Stripe and persists booking/payment state, so it should stay a smoke test unless you explicitly stub downstream integrations.

## Prerequisites

- `k6` installed locally
- server running locally or reachable through `API_BASE_URL`
- seeded demo data present

Typical local setup:

```bash
docker compose up -d db redis keycloak mailhog
npm -w apps/server run keycloak:prepare
npm -w apps/server run prisma:deploy
npm -w apps/server run db:seed
npm run dev:server
```

## Environment

Common environment variables:

```bash
TARGET_ENV=local
APP_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001
PUBLIC_COMPANY_SLUG=alex-tap-demo
COMPANY_ID=demo-company
COMPANY_TIMEZONE=America/Edmonton
K6_SLEEP_SECONDS=1
```

Production preset:

```bash
TARGET_ENV=prod
APP_BASE_URL=https://alex-tap.alexkutsenko.dev
API_BASE_URL=https://api.alexkutsenko.dev
```

The production API host above is inferred from the repo deployment config in `deploy/README.md` and `deploy/nginx/alex-tap.conf`. Override `API_BASE_URL` if your live API host differs.

Staff scenarios also require one of:

```bash
AUTH_TOKEN=<bearer token>
AUTH_COOKIE=token=<access-token>; active_company_id=demo-company
```

`AUTH_TOKEN` is the cleaner option because the API guard accepts bearer tokens directly.

If you prefer browser-style login instead of supplying a bearer token, the CRUD scenario also supports:

```bash
K6_USERNAME=<staff-email>
K6_PASSWORD=<staff-password>
```

## Running

Public reads:

```bash
npm run k6:public-read
```

Public reads against production:

```bash
npm run k6:prod:public-read
```

Frontend smoke against production:

```bash
npm run k6:prod:site
```

Conservative production read profile:

```bash
npm run k6:prod:conservative-read
```

Dashboard reads:

```bash
AUTH_TOKEN=... COMPANY_ID=demo-company npm run k6:dashboard-read
```

Dashboard reads against production:

```bash
AUTH_TOKEN=... COMPANY_ID=demo-company npm run k6:prod:dashboard-read
```

Light writes:

```bash
AUTH_TOKEN=... COMPANY_ID=demo-company ALLOW_PROD_WRITES=true npm run k6:prod:write-light
```

Jobs and clients CRUD:

```bash
npm run k6:jobs-clients-crud
```

Jobs and clients CRUD against production:

```bash
AUTH_TOKEN=... COMPANY_ID=demo-company ALLOW_PROD_WRITES=true npm run k6:prod:jobs-clients-crud
```

## Notes On Auth

The local Keycloak realm ships with demo users like `manager@gmail.com`, but the default web client disables direct password grants. Because of that, the harness does not try to automate login internally.

Use one of these approaches:

1. Log into the app in a browser, copy the access token, and export it as `AUTH_TOKEN`.
2. If you introduce a dedicated test client in Keycloak with direct grants enabled, use that client externally to mint a token and pass it into `AUTH_TOKEN`.

`jobs-clients-crud.js` can auto-login on local targets with the seeded `manager@gmail.com` / `manager` credentials when `AUTH_TOKEN`, `AUTH_COOKIE`, `K6_USERNAME`, and `K6_PASSWORD` are unset.

## Tuning

Scenario concurrency is configurable:

```bash
K6_PUBLIC_VUS=20 npm run k6:public-read
K6_DASHBOARD_VUS=10 AUTH_TOKEN=... npm run k6:dashboard-read
K6_WRITE_VUS=2 AUTH_TOKEN=... npm run k6:write-light
K6_CRUD_VUS=1 K6_CRUD_DURATION=30s npm run k6:jobs-clients-crud
```

## Production Safety

- `site-smoke.js`, `public-read.js`, and `dashboard-read.js` are safe defaults for production validation.
- `prod-conservative-read.js` is the recommended production API read profile when you want endpoint coverage without tripping public throttles.
- `write-light.js` is blocked on likely production targets unless `ALLOW_PROD_WRITES=true` is set.
- `jobs-clients-crud.js` performs writes and is blocked on likely production targets unless `ALLOW_PROD_WRITES=true` is set.
- Keep production runs small first. Start with `1` VU and short durations before increasing concurrency.

## Resource Caveats

- `clients` supports create, list, get, and update, but not hard delete.
- `jobs` supports create, list, get, update, and lifecycle actions like cancel/reopen, but not hard delete.
- `slots` endpoints are read-only availability lookups, so CRUD coverage for slots is intentionally limited to reads.
