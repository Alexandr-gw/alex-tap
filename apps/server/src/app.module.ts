import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {AuthModule} from './auth/auth.module';
import {ConfigModule} from '@nestjs/config';
import {MeModule} from "./me/me.module";
import {PrismaModule} from './prisma/prisma.module';
import {HealthModule} from './health/health.module';
import {ThrottlerModule} from '@nestjs/throttler';
import {ServicesModule} from './modules/services/services.module';
import {SlotsModule} from "@/slots/slots.module";

@Module({
    imports: [AuthModule, ConfigModule.forRoot({isGlobal: true}), MeModule, PrismaModule, HealthModule,
        ThrottlerModule.forRoot([
            {ttl: 60_000, limit: 20},
        ]), ServicesModule, SlotsModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {
}
