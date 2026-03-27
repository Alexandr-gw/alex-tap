import { Module } from '@nestjs/common';
import { NotificationModule } from '@/notifications/notification.module';
import { AlertsModule } from '@/alerts/alerts.module';
import { ActivityModule } from '@/activity/activity.module';
import { ScheduleService } from './schedule.service';

@Module({
    imports: [NotificationModule, AlertsModule, ActivityModule],
    providers: [ScheduleService],
    exports: [ScheduleService],
})
export class ScheduleModule {}
