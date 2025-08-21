import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [], // add AuthModule, ConfigModule, PrismaModule later
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
