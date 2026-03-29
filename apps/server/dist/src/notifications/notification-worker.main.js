"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const notification_worker_module_1 = require("./notification-worker.module");
const app_logger_service_1 = require("../observability/app-logger.service");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(notification_worker_module_1.NotificationWorkerModule, {
        bufferLogs: true,
    });
    const logger = app.get(app_logger_service_1.AppLogger);
    app.useLogger(logger);
    logger.info('notification.worker.started');
    const shutdown = async (signal) => {
        logger.info('notification.worker.shutdown', { signal });
        await app.close();
        process.exit(0);
    };
    process.once('SIGINT', () => {
        void shutdown('SIGINT');
    });
    process.once('SIGTERM', () => {
        void shutdown('SIGTERM');
    });
}
void bootstrap();
//# sourceMappingURL=notification-worker.main.js.map