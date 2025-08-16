import * as Sentry from "@sentry/node";
export function initSentry() {
    if (!process.env.SENTRY_DSN) return;
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV, tracesSampleRate: 0.1 });
}
