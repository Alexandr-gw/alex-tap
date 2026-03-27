import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from "cookie-parser";
import { AppLogger } from '@/observability/app-logger.service';
import { RequestContextMiddleware } from '@/observability/request-context.middleware';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    const logger = app.get(AppLogger);
    const requestContextMiddleware = app.get(RequestContextMiddleware);

    app.useLogger(logger);

    // middleware
    app.use(cookieParser());
    app.use(requestContextMiddleware.use.bind(requestContextMiddleware));

    // let Nest handle SIGINT/SIGTERM and call OnModuleDestroy on providers
    app.enableShutdownHooks();

    const port = Number(process.env.PORT ?? 5000);
    await app.listen(port);
    logger.info('server.started', { port });
}

bootstrap();
