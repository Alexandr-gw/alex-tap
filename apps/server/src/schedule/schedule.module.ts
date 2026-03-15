import { Module } from '@nestjs/common';
import { NotificationModule } from '@/notifications/notification.module';
import { AlertsModule } from '@/alerts/alerts.module';
import { ScheduleService } from './schedule.service';

@Module({
    imports: [NotificationModule, AlertsModule],
    providers: [ScheduleService],
    exports: [ScheduleService],
})
export class ScheduleModule {}
