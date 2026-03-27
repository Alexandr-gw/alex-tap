import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { NotificationModule } from '@/notifications/notification.module';

@Module({
    imports: [NotificationModule],
    controllers: [HealthController],
})
export class HealthModule {}
