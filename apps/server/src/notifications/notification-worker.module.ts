import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from './notification.module';
import { NotificationWorkerService } from './notification-worker.service';
import { ObservabilityModule } from '@/observability/observability.module';
import { configModuleOptions } from '@/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    PrismaModule,
    ObservabilityModule,
    NotificationModule,
  ],
  providers: [NotificationWorkerService],
})
export class NotificationWorkerModule {}
