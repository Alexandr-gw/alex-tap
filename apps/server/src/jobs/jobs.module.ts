import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { SlotsModule } from '@/slots/slots.module';
import { ScheduleModule } from '@/schedule/schedule.module';
import { PaymentsModule } from '@/payments/payments.module';
import { NotificationModule } from '@/notifications/notification.module';
import { ActivityModule } from '@/activity/activity.module';
import { JobAccessService } from './services/job-access.service';
import { JobAssignmentService } from './services/job-assignment.service';
import { JobCreationService } from './services/job-creation.service';
import { JobDraftService } from './services/job-draft.service';
import { JobCollaborationService } from './services/job-collaboration.service';
import { JobLifecycleService } from './services/job-lifecycle.service';
import { JobQueryService } from './services/job-query.service';

@Module({
  imports: [
    SlotsModule,
    ScheduleModule,
    PaymentsModule,
    NotificationModule,
    ActivityModule,
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobAccessService,
    JobAssignmentService,
    JobDraftService,
    JobQueryService,
    JobCreationService,
    JobLifecycleService,
    JobCollaborationService,
  ],
  exports: [JobsService],
})
export class JobsModule {}
