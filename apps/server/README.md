# Server

## Observability MVP

This backend now includes production-style observability aimed at demo and portfolio use:

- structured JSON logs instead of ad hoc console output
- per-request `requestId` correlation
- `traceId` propagation from API requests into async notification workers
- centralized error logging with generated `errorId`
- safe error references returned to API clients
- persisted audit logs for key business actions

## Log types

### Request logs

Every HTTP request emits one structured log entry after the response finishes.

Typical fields:

- `method`
- `route`
- `status`
- `durationMs`
- `requestId`
- `traceId`
- `userId`
- `companyId`

These logs answer: "What request happened, for whom, and how did it end?"

### Error logs

Unhandled API errors are captured by the global exception filter.

Server-side error logs include:

- `errorId`
- `requestId`
- `traceId`
- safe route/method metadata
- error name/message
- stack trace

API responses return only safe references:

```json
{
  "statusCode": 500,
  "message": "An unexpected error occurred. Please contact support with the error reference.",
  "errorId": "3f0d7c9d-....",
  "requestId": "8d8f7d0d-...."
}
```

These logs answer: "Why did this fail, and how do we correlate the user-visible failure with the server log?"

### Audit logs

Audit logs are persisted in the `AuditLog` table and capture important business mutations.

Examples:

- job updates and status changes
- client create/update
- payment success/refund
- service create/update
- company settings changes
- worker create/update

These logs answer: "What important business action changed the system?"

## Async trace linking

Notification queue jobs now carry trace metadata from the originating API request:

- API request creates `requestId` + `traceId`
- queue payload stores trace link metadata
- worker starts a new worker-side `requestId`
- worker reuses the original `traceId`

That means API request logs, queue logs, worker start/completion logs, and worker failure logs can all be linked through the same trace.

## Sensitive data handling

Logs intentionally redact or mask sensitive values such as:

- cookies
- authorization headers
- tokens and secrets
- raw provider payloads
- emails and phone numbers
- addresses and free-form notes in audit payloads

## Main files

- `src/observability/observability.module.ts`
- `src/observability/app-logger.service.ts`
- `src/observability/request-context.service.ts`
- `src/observability/request-context.middleware.ts`
- `src/observability/request-context.interceptor.ts`
- `src/observability/global-exception.filter.ts`
- `src/observability/audit-log.service.ts`
- `src/notifications/queue/notification-queue.service.ts`
- `src/notifications/notification-worker.service.ts`

## Running

```bash
npm run build
npm run start:dev
npm run start:worker
```

The API and notification worker will both emit structured JSON logs to stdout/stderr.

## Keycloak Realm Generation

Generate realm imports with:

```bash
npm run keycloak:generate-realms
```

Social identity providers are included only when both client id and client secret are present in the generation environment.

Supported variables:

- `KEYCLOAK_LOCAL_GOOGLE_CLIENT_ID`
- `KEYCLOAK_LOCAL_GOOGLE_CLIENT_SECRET`
- `KEYCLOAK_LOCAL_GITHUB_CLIENT_ID`
- `KEYCLOAK_LOCAL_GITHUB_CLIENT_SECRET`
- `KEYCLOAK_STAGING_GOOGLE_CLIENT_ID`
- `KEYCLOAK_STAGING_GOOGLE_CLIENT_SECRET`
- `KEYCLOAK_STAGING_GITHUB_CLIENT_ID`
- `KEYCLOAK_STAGING_GITHUB_CLIENT_SECRET`
- `KEYCLOAK_PROD_GOOGLE_CLIENT_ID`
- `KEYCLOAK_PROD_GOOGLE_CLIENT_SECRET`
- `KEYCLOAK_PROD_GITHUB_CLIENT_ID`
- `KEYCLOAK_PROD_GITHUB_CLIENT_SECRET`

Production generation also accepts generic fallback names:

- `KEYCLOAK_GOOGLE_CLIENT_ID`
- `KEYCLOAK_GOOGLE_CLIENT_SECRET`
- `KEYCLOAK_GITHUB_CLIENT_ID`
- `KEYCLOAK_GITHUB_CLIENT_SECRET`

Realm imports only apply to newly created realms. Existing Keycloak realms need an idempotent `kcadm.sh` update or a reset/reimport.
