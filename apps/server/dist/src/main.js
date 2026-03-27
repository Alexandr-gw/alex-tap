"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_logger_service_1 = require("./observability/app-logger.service");
const request_context_middleware_1 = require("./observability/request-context.middleware");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
    const logger = app.get(app_logger_service_1.AppLogger);
    const requestContextMiddleware = app.get(request_context_middleware_1.RequestContextMiddleware);
    app.useLogger(logger);
    app.use((0, cookie_parser_1.default)());
    app.use(requestContextMiddleware.use.bind(requestContextMiddleware));
    app.enableShutdownHooks();
    const port = Number(process.env.PORT ?? 5000);
    await app.listen(port);
    logger.info('server.started', { port });
}
bootstrap();
//# sourceMappingURL=main.js.map