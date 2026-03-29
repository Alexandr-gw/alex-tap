# Alex Tap

Alex Tap is a multi-tenant booking, scheduling, and operations platform for service businesses. The repository currently contains a Vite React frontend, a NestJS backend, and a custom Keycloak theme app.

It supports:

- public service booking and Stripe checkout
- staff scheduling for jobs and lightweight tasks
- role-based dashboard access with Keycloak
- clients, alerts, activity, settings, and dashboard surfaces
- background notifications through Redis + BullMQ worker flows

## Stack

- Frontend: Vite, React, React Router, React Query, Tailwind CSS
- Backend: NestJS, Prisma, PostgreSQL
- Auth: Keycloak with OIDC + PKCE
- Payments: Stripe
- Background jobs: Redis + BullMQ
- Notifications: SMTP, Resend, Twilio adapters
- Observability: structured JSON logging, request context, audit logs
- Optional AI: OpenAI-backed dashboard briefing

## Repository Layout

```text
alex-tap/
|- apps/
|  |- client/           # Vite React SPA
|  |- server/           # NestJS API + Prisma
|  |- keycloak-theme/   # Custom Keycloak theme bundle
|- .github/workflows/
|- docker-compose.yml
|- Architecture.md
|- README.md
```

## Architecture

High-level system documentation lives in [Architecture.md](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/Architecture.md).

## Main Features

### Public booking

- public service listing and booking wizard
- slot lookup against worker availability and existing jobs
- Stripe checkout flow
- booking access link pages for follow-up and change requests

Relevant files:

- [BookingWizardPage.tsx](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/client/src/features/booking/pages/BookingWizardPage.tsx)
- [public-booking.controller.ts](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/server/src/public-booking/public-booking.controller.ts)
- [public-booking.service.ts](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/server/src/public-booking/public-booking.service.ts)

### Auth and company-aware dashboard

- Keycloak login, callback, refresh, and logout
- `/me` endpoint with memberships and active company resolution
- protected dashboard routes with role checks

Relevant files:

- [auth.controller.ts](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/server/src/auth/auth.controller.ts)
- [me.controller.ts](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/server/src/me/me.controller.ts)
- [router.tsx](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/client/src/app/router.tsx)

### Schedule and tasks

- day schedule with jobs and tasks
- task create/edit modal
- drag and resize interactions on scheduled items
- unassigned items side panel

Relevant files:

- [SchedulePage.tsx](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/client/src/features/schedule/pages/SchedulePage.tsx)
- [ScheduleLayout.tsx](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/client/src/features/schedule/components/ScheduleLayout.tsx)
- [tasks.controller.ts](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/server/src/tasks/tasks.controller.ts)

### Jobs, clients, alerts, and activity

- jobs list and job details
- clients list and detail views
- booking review alerts inbox
- recent activity feed and job activity timeline

### Payments and notifications

- checkout session creation and summary endpoints
- Stripe webhook processing
- notification queueing and worker-based delivery
- reminder and confirmation lifecycle tracking

Relevant files:

- [payments.controller.ts](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/server/src/payments/payments.controller.ts)
- [stripe.webhook.controller.ts](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/server/src/webhooks/stripe.webhook.controller.ts)
- [notification.service.ts](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/server/src/notifications/notification.service.ts)

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop or compatible Docker runtime

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Prepare environment files

Use the root example file as a guide:

- [\.env.example](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/.env.example)

The app currently reads env values from:

- [apps/server/.env](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/server/.env)
- [apps/client/.env](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/apps/client/.env)

### 3. Start local infrastructure

```bash
docker compose up -d db redis keycloak mailhog
```

If you want the background worker running in Docker too:

```bash
docker compose up -d notification-worker
```

### 4. Build Keycloak theme assets and local realm data

```bash
npm -w apps/server run keycloak:prepare
```

### 5. Apply database migrations and seed demo data

```bash
npm -w apps/server run prisma:deploy
npm -w apps/server run db:seed
```

### 6. Start the app processes

Run these in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Optional worker process outside Docker:

```bash
npm -w apps/server run start:worker
```

## Common Commands

At the repo root:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Direct workspace commands:

```bash
npm -w apps/server run start:dev
npm -w apps/server run start:worker
npm -w apps/server run prisma:deploy
npm -w apps/server run db:seed
npm -w apps/client run dev
```

## Local URLs

Typical local services:

- Client app: `http://localhost:5173`
- API: `http://localhost:3001`
- Keycloak: `http://localhost:8080`
- Mailhog: `http://localhost:8025`

## CI

The GitHub Actions workflow validates the repo by running:

- install
- typecheck
- lint
- test
- build

Workflow file:

- [ci.yml](C:/Users/thepr/Documents/doc-dev/dev-env-compose/alex-tap/.github/workflows/ci.yml)
