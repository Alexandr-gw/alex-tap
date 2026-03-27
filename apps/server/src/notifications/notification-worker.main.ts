import { NestFactory } from '@nestjs/core';
import { NotificationWorkerModule } from './notification-worker.module';
import { AppLogger } from '@/observability/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(NotificationWorkerModule, {
    bufferLogs: true,
  });
  const logger = app.get(AppLogger);

  app.useLogger(logger);

  logger.info('notification.worker.started');

  const shutdown = async (signal: string) => {
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
