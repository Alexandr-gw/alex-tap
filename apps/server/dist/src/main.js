"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const app_logger_service_1 = require("./observability/app-logger.service");
const request_context_middleware_1 = require("./observability/request-context.middleware");
function parseAllowedOrigins() {
    const values = [
        process.env.APP_BASE_URL,
        process.env.APP_PUBLIC_URL,
        process.env.CORS_ORIGINS,
    ]
        .filter((value) => typeof value === "string" && value.trim().length > 0)
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean);
    return [...new Set(values)];
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
        rawBody: true,
    });
    const logger = app.get(app_logger_service_1.AppLogger);
    const requestContextMiddleware = app.get(request_context_middleware_1.RequestContextMiddleware);
    const allowedOrigins = parseAllowedOrigins();
    app.useLogger(logger);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.use((0, cookie_parser_1.default)());
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));
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
    app.enableShutdownHooks();
    const port = Number(process.env.PORT ?? 5000);
    await app.listen(port);
    logger.info('server.started', { port, allowedOrigins });
}
bootstrap();
//# sourceMappingURL=main.js.map