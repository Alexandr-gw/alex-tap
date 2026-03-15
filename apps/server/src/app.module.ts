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
import {JobsModule} from "@/jobs/jobs.module";
import {WorkersModule} from "@/workers/workers.module";
import {StripeModule} from "@/stripe/stripe.module";
import {PaymentsModule} from "@/payments/payments.module";
import {WebhooksModule} from "@/webhooks/webhooks.module";
import {PublicBookingModule} from "@/public-booking/public-booking.module";
import {AlertsModule} from "@/alerts/alerts.module";
import { TasksModule } from '@/tasks/tasks.module';

@Module({
    imports: [
        AuthModule,
        ConfigModule.forRoot({ isGlobal: true }),
        MeModule,
        PrismaModule,
        HealthModule,
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
        ServicesModule,
        SlotsModule,
        JobsModule,
        WorkersModule,
        StripeModule,
        PaymentsModule,
        WebhooksModule,
        PublicBookingModule,
        AlertsModule,
        TasksModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
