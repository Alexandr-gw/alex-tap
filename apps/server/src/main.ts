import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppLogger } from '@/observability/app-logger.service';
import { RequestContextMiddleware } from '@/observability/request-context.middleware';

function parseAllowedOrigins() {
    const values = [
        process.env.APP_BASE_URL,
        process.env.APP_PUBLIC_URL,
        process.env.CORS_ORIGINS,
    ]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean);

    return [...new Set(values)];
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
        rawBody: true,
    });
    const logger = app.get(AppLogger);
    const requestContextMiddleware = app.get(RequestContextMiddleware);
    const allowedOrigins = parseAllowedOrigins();

    app.useLogger(logger);
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // middleware
    app.use(cookieParser());
    app.use(
        helmet({
            // This API mostly serves JSON and redirects, so we keep CSP off for now
            // instead of shipping an incomplete policy that breaks future HTML flows.
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
        }),
    );
    app.use(requestContextMiddleware.use.bind(requestContextMiddleware));
    app.enableCors({
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'X-Company-Id',
            'Idempotency-Key',
        ],
        origin(origin, callback) {
            // Allow same-origin server calls, health checks, webhooks, and non-browser clients.
            if (!origin) {
                callback(null, true);
                return;
            }

            if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            logger.warnEvent('cors.origin.rejected', {
                origin,
                allowedOrigins,
            });
            callback(new Error('Not allowed by CORS'));
        },
    });

    // let Nest handle SIGINT/SIGTERM and call OnModuleDestroy on providers
    app.enableShutdownHooks();

    const port = Number(process.env.PORT ?? 5000);
    await app.listen(port);
    logger.info('server.started', { port, allowedOrigins });
}

bootstrap();
