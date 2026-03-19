import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { SlotsModule } from '@/slots/slots.module';
import { ScheduleModule } from '@/schedule/schedule.module';
import { PaymentsModule } from '@/payments/payments.module';
import { NotificationModule } from '@/notifications/notification.module';

@Module({
  imports: [SlotsModule, ScheduleModule, PaymentsModule, NotificationModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
