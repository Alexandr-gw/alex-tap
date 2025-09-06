import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from "cookie-parser";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // middleware
    app.use(cookieParser());

    // let Nest handle SIGINT/SIGTERM and call OnModuleDestroy on providers
    app.enableShutdownHooks();

    await app.listen(process.env.PORT ?? 5000);
}

bootstrap();
