import {Module} from '@nestjs/common';
import {APP_GUARD} from '@nestjs/core';
import {ThrottlerGuard, ThrottlerModule} from '@nestjs/throttler';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {AuthModule} from './auth/auth.module';
import {ConfigModule} from '@nestjs/config';
import {MeModule} from './me/me.module';
import {PrismaModule} from './prisma/prisma.module';
import {HealthModule} from './health/health.module';
import {ServicesModule} from './modules/services/services.module';
import {SlotsModule} from '@/slots/slots.module';
import {JobsModule} from '@/jobs/jobs.module';
import {WorkersModule} from '@/workers/workers.module';
import {StripeModule} from '@/stripe/stripe.module';
import {PaymentsModule} from '@/payments/payments.module';
import {WebhooksModule} from '@/webhooks/webhooks.module';
import {PublicBookingModule} from '@/public-booking/public-booking.module';
import {AlertsModule} from '@/alerts/alerts.module';
import {TasksModule} from '@/tasks/tasks.module';
import {ClientsModule} from '@/clients/clients.module';
import {SettingsModule} from '@/settings/settings.module';
import {ActivityModule} from '@/activity/activity.module';
import {ObservabilityModule} from '@/observability/observability.module';
import {DashboardModule} from '@/dashboard/dashboard.module';
import {RedisThrottlerStorage} from '@/common/rate-limit/redis-throttler.storage';
import {configModuleOptions} from '@/config/env.validation';

const rateLimitStorage = new RedisThrottlerStorage();

function resolveTracker(req: Record<string, any>): string {
    const forwardedFor = req.headers?.['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        return forwardedFor.split(',')[0]?.trim() || 'unknown';
    }

    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

@Module({
    imports: [
        ObservabilityModule,
        AuthModule,
        ConfigModule.forRoot(configModuleOptions),
        MeModule,
        PrismaModule,
        HealthModule,
        ThrottlerModule.forRoot({
            errorMessage: 'Too many requests, please try again later.',
            getTracker: resolveTracker,
            storage: rateLimitStorage,
            throttlers: [
                {
                    name: 'default',
                    ttl: 60_000,
                    limit: 120,
                    blockDuration: 60_000,
                },
            ],
        }),
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
        ClientsModule,
        SettingsModule,
        ActivityModule,
        DashboardModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        { provide: RedisThrottlerStorage, useValue: rateLimitStorage },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
